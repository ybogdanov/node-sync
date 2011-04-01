/*
  Copyright 2011 Yuriy Bogdanov <chinsay@gmail.com>

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to
  deal in the Software without restriction, including without limitation the
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
  sell copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
  IN THE SOFTWARE.
*/

// use node-fibers module
require('fibers');

/**
 * This code was borrowed from https://github.com/lm1/node-fiberize
 * sync() method simply turns any asynchronous function to synchronous one
 * It receives context object as first param (like Function.prototype.call)
 *
 */
Function.prototype.sync = function(obj /* arguments */) {
    
    var args = Array.prototype.slice.call(arguments),
        obj = args.shift(),
        fn = this,
        fiber = Fiber.current,
        result, cb_args,
        called = false;
    
    // virtual callback, push it as last argument
    args.push(function syncCallback(err) {
        // forbid to call twice
        if (called) return;
        called = true;
        cb_args = Array.prototype.slice.call(arguments);
        if (Fiber.current !== fiber) {
            // catch 'This Fiber is already running' error
            try {
                fiber.run();
            }
            catch(e) {}
        }
    });
    
    // call async function
    fn.apply(obj || null, args);
    
    // wait for result
    while (!cb_args) yield();
    
    // err returned as first argument
    var err = cb_args.shift();
    if (err) throw err instanceof Error ? err : new Error(err); // todo: cast to Error or not cast to Error?
    
    // result pieces as other arguments (if one, shrink it)
    result = cb_args;
    if (result.length <= 1) result = result[0];
    
    return result;
}

/**
 * Sync module itself
 */
var Sync = function Sync(fn, callback)
{
    if (fn instanceof Function) {
        return Sync.Fiber(fn, callback);
    }
    
    // TODO: we can also wrap any object with Sync, in future..
}

/**
 * This function should be used when you need to turn some peace of code fiberized
 * It just wraps your code with Fiber() logic in addition with exceptions handling
 */
Sync.Fiber = function SyncFiber(fn, callback)
{
    Fiber(function(){
        
        var fiber = Fiber.current,
            result,
            error;
        
        // Add futures support to a fiber
        fiber.futures = [];
        
        fiber.finishFutures = function() {
            var results = [];
            while (fiber.futures.length)
                results.push(fiber.futures.shift().result);
            return results;
        }
        
        fiber.removeFuture = function(ticket) {
            var index = fiber.futures.indexOf(ticket);
            if (~index)
                fiber.futures.splice(index, 1);
        }
        
        fiber.addFuture = function(ticket) {
            fiber.futures.push(ticket);
        }
        
        // Run body    
        try {
            // call fn and wait for result
            result = fn(Fiber.current);
            // if there are some futures, wait for results
            fiber.finishFutures();
        }
        catch (e) {
            error = e;
        }
        
        // return result to the callback
        if (callback instanceof Function) {
            callback(error, result);
        }
        else if (error) {
            throw error;
        }
        
    }).run();
}

/**
 * Future object itself
 */
function SyncFuture(timeout)
{
    var self = this;
    
    this.resolved = false;
    this.fiber = Fiber.current;
    this.yielding = false;
    this.timeout = timeout;
    
    this._timeoutId = null;
    this._result = undefined;
    this._error = null;
    
    // Create timeout error to capture stack trace correctly
    self.timeoutError = new Error();
    Error.captureStackTrace(self.timeoutError, arguments.callee);
    
    this.ticket = function Future()
    {
        // clear timeout if present
        if (self._timeoutId) clearTimeout(self._timeoutId);
        
        // forbid to call twice
        if (self.resolved) return;
        self.resolved = true;

        var args = Array.prototype.slice.call(arguments);

        // err returned as first argument
        var err = args.shift();
        if (err) {
            self._error = err instanceof Error ? err : new Error(err); // todo: cast to Error or not cast to Error?
        }
        else {
            // result pieces as other arguments (if one, shrink it)
            var result = args;
            if (result.length <= 1) result = result[0];
            self._result = result;
        }
        
        // remove self from current fiber
        self.fiber.removeFuture(self.ticket);
        
        if (self.yielding && Fiber.current !== self.fiber) {
            self.yielding = false;
            // catch 'This Fiber is already running' error
            try {
                self.fiber.run();
            }
            catch(e) {}
        }
    }
    
    this.ticket.__proto__ = this;
    
    this.ticket.__defineGetter__('result', function(){
        while (!self.resolved) {
            self.yielding = true;
            if (self.timeout) {
                self._timeoutId = setTimeout(function(){
                    self.timeoutError.message = 'Future function timed out at ' + self.timeout + ' ms';
                    self.ticket(self.timeoutError);
                }, self.timeout)
            }
            yield();
        }
        if (self._error) throw self._error;
        return self._result;
    });
    
    this.ticket.__defineGetter__('error', function(){
        if (self._error) {
            return self._error;
        }
        try {
            this.result;
        }
        catch (e) {
            return e;
        }
        return null;
    });
    
    this.ticket.__defineGetter__('timeout', function(){
        return self.timeout;
    });
    
    this.ticket.__defineSetter__('timeout', function(value){
        self.timeout = value;
    });
    
    // append self to current fiber
    this.fiber.addFuture(this.ticket);
    
    return this.ticket;
}

SyncFuture.prototype.__proto__ = Function;
Sync.Future = SyncFuture;

/**
 * Calls the function asynchronously and yields only when 'value' or 'error' getters called
 * Returs Future function/object (promise)
 *
 */
Function.prototype.future = function(obj /* arguments */) {
    
    var args = Array.prototype.slice.call(arguments),
        fn = this,
        obj = args.shift(),
        future = new SyncFuture();

    // virtual future callback, push it as last argument
    args.push(future);
    
    // call async function
    fn.apply(obj || null, args);
    
    return future;
}

/**
 * Use this method to make asynchronous function from synchronous one
 * This is a opposite function from .sync()
 */
Function.prototype.async = function(context)
{
    var fn = this;
    return function() {
        obj = context || this;
        var args = Array.prototype.slice.call(arguments);
        var cb = args.pop();
        var async = true;
        if (typeof(cb) !== 'function') {
            if (Fiber.current) {
                args.push(cb);
                async = false;
            }
            else {
                throw new Error('Missing callback as last argument to async function');
            }
        }
        // Call asynchronously
        if (async) {
            Sync(function(){
                return fn.apply(obj, args);
            }, cb)
        }
        // Call synchronously in same fiber
        else {
            return fn.apply(obj, args);
        }
    }
}

/**
 * This method runs fn function body and waits until all callbacks inside will be returned
 * Useful when you need to do multiple tasks in parallel inside
 * of Fiber but continue only when all tasks will be completed (or wait for result)
 */
Sync.Parallel = function SyncParallel(fn)
{
    var fiber = Fiber.current;
    var i = 0, result, assoc;
    
    function callback(k) {
        if (assoc === undefined) {
            assoc = !!k;
        }
        else if (!!k !== assoc) {
            i = 0;
            throw new Error('FiberParallel cannot mix associative callbacks with non-associative ones');
        }
        i++;
        return function(err, data){
            i--;
            if (err) {
                return fiber.throwInto(err instanceof Error ? err : new Error(err));
            }
            if (data !== undefined) {
                if (k) {
                    if (!result) result = {};
                    result[k] = data;
                }
                else {
                    if (!result) result = [];
                    result.push(data);
                }
            }
            if (i == 0 && Fiber.current !== fiber) {
                fiber.run();
            }
        }
    }
    
    fn(callback);
    while (i > 0) yield();
    
    return result;
}

/**
 * Sleeps current fiber on given value of millis
 */
Sync.sleep = function(ms)
{
    var fiber = Fiber.current;
    if (!fiber) {
        throw new Error('Sync.sleep() can be called only inside of fiber');
    }
    
    setTimeout(function(){
        fiber.run();
    }, ms);
    
    yield();
}

module.exports = exports = Sync;
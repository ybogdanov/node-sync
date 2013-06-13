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
var Fiber = require('fibers');

/**
 * sync() method simply turns any asynchronous function to synchronous one
 * It receives context object as first param (like Function.prototype.call)
 *
 */
Function.prototype.sync = function(obj /* arguments */) {
    
    var fiber = Fiber.current,
        err, result,
        yielded = false;

    // Create virtual callback
    var syncCallback = function (callbackError, callbackResult, otherArgs) {
        // forbid to call twice
        if (syncCallback.called) return;
        syncCallback.called = true;
        
        if (callbackError) {
            err = callbackError;
        }
        else if (otherArgs) {
            // Support multiple callback result values
            result = [];
            for (var i = 1, l = arguments.length; i < l; i++) {
                result.push(arguments[i]);
            }
        }
        else {
            result = callbackResult;
        }
        
        // Resume fiber if yielding
        if (yielded) fiber.run();
    }
    
    // Prepare args (remove first arg and add callback to the end)
    // The cycle is used because of slow v8 arguments materialization
    for (var i = 1, args = [], l = arguments.length; i < l; i++) {
        args.push(arguments[i]);
    }
    args.push(syncCallback);
    
    // call async function
    this.apply(obj, args);
    
    // wait for result
    if (!syncCallback.called) {
        yielded = true;
        Fiber.yield();
    }
    
    // Throw if err
    if (err) throw err;
    
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

Sync.stat = {
    totalFibers : 0,
    activeFibers : 0,
    totalFutures : 0,
    activeFutures : 0
}

/**
 * This function should be used when you need to turn some peace of code fiberized
 * It just wraps your code with Fiber() logic in addition with exceptions handling
 */
Sync.Fiber = function SyncFiber(fn, callback)
{
    var parent = Fiber.current;
    Sync.stat.totalFibers++;
    
    var traceError = new Error();
    if (parent) {
        traceError.__previous = parent.traceError;
    }
    
    var fiber = Fiber(function(){
        
        Sync.stat.activeFibers++;
        
        var fiber = Fiber.current,
            result,
            error;
        
        // Set id to fiber
        fiber.id = Sync.stat.totalFibers;
        
        // Save the callback to fiber
        fiber.callback = callback;
        
        // Register trace error to the fiber
        fiber.traceError = traceError;
        
        // Initialize scope
        fiber.scope = {};
        
        // Assign parent fiber
        fiber.parent = parent;
        
        // Fiber string representation
        fiber.toString = function() {
            return 'Fiber#' + fiber.id;
        }
        
        // Fiber path representation
        fiber.getPath = function() {
            return (fiber.parent ? fiber.parent.getPath() + ' > ' : '' )
                + fiber.toString();
        }
        
        // Inherit scope from parent fiber
        if (parent) {
            fiber.scope.__proto__ = parent.scope;
        }
        
        // Add futures support to a fiber
        fiber.futures = [];
        
        fiber.waitFutures = function() {
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
            fiber.waitFutures();
        }
        catch (e) {
            error = e;
        }
        
        Sync.stat.activeFibers--;
        
        // return result to the callback
        if (callback instanceof Function) {
            callback(error, result);
        }
        else if (error && parent && parent.callback) {
            parent.callback(error);
        }
        else if (error) {
            // TODO: what to do with such errors?
            // throw error;
        }
        
    });
    
    fiber.run();
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
    this.time = null;
    
    this._timeoutId = null;
    this._result = undefined;
    this._error = null;
    this._start = +new Date;
    
    Sync.stat.totalFutures++;
    Sync.stat.activeFutures++;
    
    // Create timeout error to capture stack trace correctly
    self.timeoutError = new Error();
    Error.captureStackTrace(self.timeoutError, arguments.callee);
    
    this.ticket = function Future()
    {
        // clear timeout if present
        if (self._timeoutId) clearTimeout(self._timeoutId);
        // measure time
        self.time = new Date - self._start;
        
        // forbid to call twice
        if (self.resolved) return;
        self.resolved = true;

        // err returned as first argument
        var err = arguments[0];
        if (err) {
            self._error = err;
        }
        else {
            self._result = arguments[1];
        }
        
        // remove self from current fiber
        self.fiber.removeFuture(self.ticket);
        Sync.stat.activeFutures--;
        
        if (self.yielding && Fiber.current !== self.fiber) {
            self.yielding = false;
            self.fiber.run();
        }
        else if (self._error) {
            throw self._error;
        }
    }
    
    this.ticket.__proto__ = this;
    
    this.ticket.yield = function() {
        while (!self.resolved) {
            self.yielding = true;
            if (self.timeout) {
                self._timeoutId = setTimeout(function(){
                    self.timeoutError.message = 'Future function timed out at ' + self.timeout + ' ms';
                    self.ticket(self.timeoutError);
                }, self.timeout)
            }
            Fiber.yield();
        }
        if (self._error) throw self._error;
        return self._result;
    }
    
    this.ticket.__defineGetter__('result', function(){
        return this.yield();
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
    
    var fn = this,
        future = new SyncFuture();

    // Prepare args (remove first arg and add callback to the end)
    // The cycle is used because of slow v8 arguments materialization
    for (var i = 1, args = [], l = arguments.length; i < l; i++) {
        args.push(arguments[i]);
    }
    // virtual future callback, push it as last argument
    args.push(future);
    
    // call async function
    fn.apply(obj, args);
    
    return future;
}

/**
 * Use this method to make asynchronous function from synchronous one
 * This is a opposite function from .sync()
 */
Function.prototype.async = function(context)
{
    var fn = this, fiber = Fiber.current;
    
    function asyncFunction() {
        
        // Prepare args (remove first arg and add callback to the end)
        // The cycle is used because of slow v8 arguments materialization
        for (var i = 0, args = [], l = arguments.length; i < l; i++) {
            args.push(arguments[i]);
        }

        var obj = context || this,
            cb = args.pop(),
            async = true;
        
        if (typeof(cb) !== 'function') {
            args.push(cb);
            if (Fiber.current) async = false;
        }
        
        Fiber.current = Fiber.current || fiber;
        
        // Call asynchronously
        if (async) {
            Sync(function(){
                return fn.apply(obj, args);
            }, cb);
        }
        // Call synchronously in same fiber
        else {
            return fn.apply(obj, args);
        }
    }
    
    // Do nothing on async again
    asyncFunction.async = function() {
        return asyncFunction;
    }
    // Override sync call
    asyncFunction.sync = function(obj) {
        for (var i = 1, args = [], l = arguments.length; i < l; i++) {
            args.push(arguments[i]);
        }
        return fn.apply(obj || context || this, args);
    }
    // Override toString behavior
    asyncFunction.toString = function() {
		return fn + '.async()';
	}
    
    return asyncFunction;
}

/**
 * Used for writing synchronous middleware-style functions
 * 
 * throw "something" --> next('something')
 * return --> next()
 * return null --> next()
 * return undefined --> next()
 * return true --> void
 */
Function.prototype.asyncMiddleware = function(obj){
    var fn = this.async(obj);
    // normal (req, res) middleware
    if (this.length === 2) {
        return function(req, res, next) {
            return fn.call(this, req, res, function(err, result){
                if (err) return next(err);
                if (result !== true) next();
            });
        }
    }
    // error handling (err, req, res) middleware
    else if (this.length === 3) {
        return function(err, req, res, next) {
            return fn.call(this, err, req, res, function(err, result){
                if (err) return next(err);
                if (result !== true) next();
            });
        }
    }
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
    
    Fiber.yield();
}

/**
 * Logs sync result
 */
Sync.log = function(err, result)
{
    if (err) return console.error(err.stack || err);
    if (arguments.length == 2) {
        if (result === undefined) return;
        return console.log(result);
    }
    console.log(Array.prototyle.slice.call(arguments, 1));
}

/**
 * Synchronous repl implementation: each line = new fiber
 */
Sync.repl = function() {
    
    var repl = require('repl');
    
    // Start original repl
    var r = repl.start.apply(repl, arguments);
    
    // Wrap line watchers with Fiber
    var newLinsteners = []
    r.rli.listeners('line').map(function(f){
        newLinsteners.push(function(a){
            Sync(function(){
                require.cache[__filename] = module;
                f(a);
            }, Sync.log)
        })
    })
    r.rli.removeAllListeners('line');
    while (newLinsteners.length) {
        r.rli.on('line', newLinsteners.shift());
    }
    
    // Assign Sync to repl context
    r.context.Sync = Sync;
    
    return r;
};

// TODO: document
Sync.__defineGetter__('scope', function() {
    return Fiber.current && Fiber.current.scope;
})

// TODO: document
Sync.waitFutures = function() {
    if (Fiber.current) {
        Fiber.current.waitFutures();
    }
}

// Expose Fibers
Sync.Fibers = Fiber;

module.exports = exports = Sync;

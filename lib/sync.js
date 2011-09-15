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
            // ignore 'This Fiber is already running' exception
            // TODO: investigate this behavior
            try {
                fiber.run();
            }
            catch (e) {}
        }
    });
    
    // call async function
    fn.apply(obj || null, args);
    
    // wait for result
    while (!cb_args) Fiber.yield();
    
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
            //error.__previous = traceError;
            
            // TODO: document
            /*var stackGetter = error.__lookupGetter__('stack');
            if (stackGetter) {
                error.__defineGetter__('stack', function(){
                    var stack = stackGetter.call(this);
                    return stack;
                    //return .toUpperCase();
                })
            }*/
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
            throw error;
        }
        
    });
    
    fiber.run();
    
    return;
    
    try {
        fiber.run();
    } catch (e) {
        
        //console.log(fiberError.stack);
        throw e;
        
        /*console.log(parent.callback);
        if (parent && parent.callback) {
            parent.callback(e);
        }
        else {
            throw e;
        }*/
        //console.log(Fiber.current.throwInto(e));
        //Fiber.current.throwInto(e)
        //console.log('hihi', e.stack)
        //callback(e);
    }
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
    
    var traceError = new Error();
    traceError.__previous = this.fiber.traceError;
    //console.log('new future', this.fiber.id, typeof this.fiber.traceError.__previous, traceError.stack);
    
    // Create timeout error to capture stack trace correctly
    self.timeoutError = new Error();
    Error.captureStackTrace(self.timeoutError, arguments.callee);
    
    this.ticket = function Future()
    {
        // clear timeout if present
        if (self._timeoutId) clearTimeout(self._timeoutId);
        // measure time
        self.time = +new Date - self._start;
        
        // forbid to call twice
        if (self.resolved) return;
        self.resolved = true;

        var args = Array.prototype.slice.call(arguments);

        // err returned as first argument
        var err = args.shift();
        if (err) {
            self._error = err;
            self._error.__previous = traceError;
            //console.log('SET PREV')
            //console.log('xxx', err.stack)
        }
        else {
            // result pieces as other arguments (if one, shrink it)
            var result = args;
            if (result.length <= 1) result = result[0];
            self._result = result;
        }
        
        // remove self from current fiber
        self.fiber.removeFuture(self.ticket);
        Sync.stat.activeFutures--;
        
        if (self.yielding && Fiber.current !== self.fiber) {
            self.yielding = false;
            // catch 'This Fiber is already running' error
            try {
                self.fiber.run();
            }
            catch(e) {}
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
    var fn = this, fiber = Fiber.current;
    
    function asyncFunction() {
        
        obj = context || this;
        var args = Array.prototype.slice.call(arguments),
            cb = args.pop(),
            async = true;
        
        Fiber.current = Fiber.current || fiber;
        if (typeof(cb) !== 'function') {
            args.push(cb);
            if (Fiber.current) async = false;
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
    
    // Do nothing on async again
    asyncFunction.async = function() {
        return asyncFunction;
    }
    // Override sync call
    asyncFunction.sync = function(obj) {
        var args = Array.prototype.slice.call(arguments),
            obj = args.shift() || context || this;
        return fn.apply(obj, args);
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
(function(){
    
    // TODO: implement
    return;
    
    var filename = new Error().stack.split("\n")[1].match(/^    at ((?:\w+:\/\/)?[^:]+)/)[1];
    function filterInternalFrames(frames) {
        return frames.split("\n").filter(function(frame) { return frame.indexOf(filename) < 0; }).join("\n");
    }
    
    var has = Object.prototype.hasOwnProperty;

    var prepareOrig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(error, structuredStackTrace) {
        
        //console.log('Error.prepareStackTrace')
        //return prepareOrig.call(Error, error, structuredStackTrace);
        
        if (!error.__cachedTrace) {
            error.__cachedTrace = filterInternalFrames(FormatStackTrace(error, structuredStackTrace));
            if (has.call(error, "__previous")) {
                var previousTrace = error.__previous.stack;
                error.__cachedTrace += "\n" + previousTrace.substring(previousTrace.indexOf("\n") + 1);
            }
        }
        
        return error.__cachedTrace;
    }

    // Copyright 2006-2008 the V8 project authors. All rights reserved.
    // Redistribution and use in source and binary forms, with or without
    // modification, are permitted provided that the following conditions are
    // met:
    //
    //     * Redistributions of source code must retain the above copyright
    //       notice, this list of conditions and the following disclaimer.
    //     * Redistributions in binary form must reproduce the above
    //       copyright notice, this list of conditions and the following
    //       disclaimer in the documentation and/or other materials provided
    //       with the distribution.
    //     * Neither the name of Google Inc. nor the names of its
    //       contributors may be used to endorse or promote products derived
    //       from this software without specific prior written permission.
    //
    // THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
    // "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
    // LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
    // A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
    // OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
    // SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
    // LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    // DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    // THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    // (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    // OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

    function FormatStackTrace(error, frames) {
      var lines = [];
      try {
        lines.push(error.toString());
      } catch (e) {
        try {
          lines.push("<error: " + e + ">");
        } catch (ee) {
          lines.push("<error>");
        }
      }
      for (var i = 0; i < frames.length; i++) {
        var frame = frames[i];
        var line;
        try {
          line = FormatSourcePosition(frame);
        } catch (e) {
          try {
            line = "<error: " + e + ">";
          } catch (ee) {
            // Any code that reaches this point is seriously nasty!
            line = "<error>";
          }
        }
        lines.push("    at " + line);
      }
      return lines.join("\n");
    }

    function FormatSourcePosition(frame) {
      var fileLocation = "";
      if (frame.isNative()) {
        fileLocation = "native";
      } else if (frame.isEval()) {
        fileLocation = "eval at " + frame.getEvalOrigin();
      } else {
        var fileName = frame.getFileName();
        if (fileName) {
          fileLocation += fileName;
          var lineNumber = frame.getLineNumber();
          if (lineNumber != null) {
            fileLocation += ":" + lineNumber;
            var columnNumber = frame.getColumnNumber();
            if (columnNumber) {
              fileLocation += ":" + columnNumber;
            }
          }
        }
      }
      if (!fileLocation) {
        fileLocation = "unknown source";
      }
      var line = "";
      var functionName = frame.getFunction().name;
      var addPrefix = true;
      var isConstructor = frame.isConstructor();
      var isMethodCall = !(frame.isToplevel() || isConstructor);
      if (isMethodCall) {
        var methodName = frame.getMethodName();
        line += frame.getTypeName() + ".";
        if (functionName) {
          line += functionName;
          if (methodName && (methodName != functionName)) {
            line += " [as " + methodName + "]";
          }
        } else {
          line += methodName || "<anonymous>";
        }
      } else if (isConstructor) {
        line += "new " + (functionName || "<anonymous>");
      } else if (functionName) {
        line += functionName;
      } else {
        line += fileLocation;
        addPrefix = false;
      }
      if (addPrefix) {
        line += " (" + fileLocation + ")";
      }
      return line;
    }

})()





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

module.exports = exports = Sync;
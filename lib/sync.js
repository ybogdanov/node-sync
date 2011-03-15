
// use node-fibers module
require('fibers');

/**
 * This code was borrowed from https://github.com/lm1/node-fiberize
 * sync() method simply turns any asynchronous function to synchronous one
 * It receives context object as first param (like Function.prototype.call)
 *
 */
Function.prototype.sync = function(obj /* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    var obj = args.shift();
    var fn = this;
    var fiber = Fiber.current;
    var result;
    var cb_args;
    var cb = function(err) {
      cb_args = Array.prototype.slice.call(arguments);
      if (Fiber.current !== fiber) {
          // catch 'This Fiber is already running' error
          try {
              fiber.run();
          }
          catch(e) {
          }
      }
    };
    args.push(cb);
    var result = fn.apply(obj || null, args);
    if (result === this) {
      result = undefined;
    }
    while (!cb_args) {
      yield();
    }
    if (result !== undefined) {
      result = [result].concat(cb_args);
    } else {
      var err = cb_args.shift();
      if (err) throw err instanceof Error ? err : new Error(err);
      result = cb_args;
    }
    if (result.length <= 1) {
      result = result[0];
    }
    return result;
}

/**
 * This function should be used when you need to turn some peace of code fiberized
 * It just wraps your code with Fiber() logic in addition with exceptions handling
 */
var SyncFiber = exports.Fiber = function SyncFiber(fn, callback)
{
    callback = callback || function(){};
    
    Fiber(function(){
        try {
            callback(null, fn(Fiber.current));
        }
        catch (e) {
            callback(e);
        }
    }).run();
}

/**
 * Use this method to make asynchronous function from synchronous one
 * This is a opposite function from .sync()
 */
Function.prototype.async = function(obj)
{
    var fn = this;
    return function() {
        var args = Array.prototype.slice.call(arguments);
        var cb = args.pop();
        if (typeof(cb) !== 'function') {
            throw new Error('Missing callback as last argument to async function');
        }
        SyncFiber(function(){
            return fn.apply(obj, args);
        }, cb)
    }
}

/**
 * This method runs fn function body and waits until all callbacks inside will be returned
 * Useful when you need to do multiple tasks in parallel inside
 * of Fiber but continue only when all tasks will be completed (or wait for result)
 */
var FiberParallel = exports.Parallel = function FiberParallel(fn)
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
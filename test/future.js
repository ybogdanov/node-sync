
/**
 * Tests for Function.prototype.future
 */

var Sync = require('..'),
    Fiber = require('fibers'),
    assert = require('assert');

// Simple asynchronous function
function asyncFunction(a, b, callback) {
    process.nextTick(function(){
        callback(null, a + b);
    })
}

// asynchronous with timeout
function asyncFunctionTimeout(t, callback) {
    setTimeout(function(){
        callback(null, 'result');
    }, t)
}

// synchronous with timeout
function syncFunctionTimeout(t) {
    var fiber = Fiber.current;
    setTimeout(function(){
        fiber.run('result');
    }, t)
    return Fiber.yield();
}

// Simple asynchronous function which throws an exception
function asyncFunctionThrowsException(a, b, callback) {
    process.nextTick(function(){
        callback('something went wrong');
    })
}

// Wrong asynchronous which calls callback twice
function asyncFunctionCallbackTwice(a, b, callback) {
    process.nextTick(function(){
        callback(null, a + b);
        callback(null, a - b);
    })
}

// test object
var testObject = {
    
    property : 2,
    
    asyncMethod : function someAsyncMethod(b, callback) {
        var self = this;
        process.nextTick(function(){
            callback(null, self.property + b);
        })
    },
    
    asyncMethodThrowsException : function someAsyncMethodThrowsException(b, callback) {
        process.nextTick(function(){
            callback('something went wrong');
        })
    }
}

var runTest = module.exports = function(callback)
{
    Sync(function(){
        
        // test on returning value
        var future = asyncFunction.future(null, 2, 3);
        // check future function
        assert.ok(future instanceof Sync.Future);
        assert.ok(future instanceof Function);
        // check future result
        assert.equal(future.result, 2 + 3);
        // check error
        assert.strictEqual(future.error, null);
        
        // test on returning value
        var future = asyncFunction.future(null, 2, 3);
        // check future result
        assert.equal(future.yield(), 2 + 3);
        // check error
        assert.strictEqual(future.error, null);
        
        // check yield on error getter
        var future = asyncFunction.future(null, 2, 3);
        // check error
        assert.strictEqual(future.error, null);
        // check future result
        assert.equal(future.result, 2 + 3);
    
        // test on throws exception
        var future = asyncFunctionThrowsException.future(null, 2, 3);
        assert.throws(function(){
            future.result;
        }, 'something went wrong');
        // check error
        assert.ok(future.error);
        
        // test asynchronous which calls callback twice (should not be called twice)
        var future = asyncFunctionCallbackTwice.future(null, 2, 3);
        assert.equal(future.result, 2 + 3);
    
        // test on returning value with object context
        var future = testObject.asyncMethod.future(testObject, 3);
        assert.equal(future.result, testObject.property + 3);
    
        // test on throws exception with object context
        var future = testObject.asyncMethodThrowsException.future(testObject, 2);
        assert.throws(function(){
            future.result;
        }, 'something went wrong');
        
        // test straight Sync.Future usage
        asyncFunction(2, 3, future = new Sync.Future());
        // check error
        assert.strictEqual(future.error, null);
        // check future result
        assert.equal(future.result, 2 + 3);
        
        // test two futures goes in parallel
        var start = new Date();
        var future1 = asyncFunctionTimeout.future(null, 100);
        var future2 = asyncFunctionTimeout.future(null, 100);
        assert.ok(future1.result);
        assert.ok(future2.result);
        var duration = new Date - start;
        assert.ok(duration < 110);
        
        // test two async() futures goes in parallel
        var start = new Date();
        var future1 = syncFunctionTimeout.async().future(null, 100);
        var future2 = syncFunctionTimeout.async().future(null, 100);
        assert.ok(future1.result);
        assert.ok(future2.result);
        var duration = new Date - start;
        assert.ok(duration < 110);
        
        // Test futures are automatically resolved when Fiber ends
        var futures = [];
        Sync(function(){
            futures.push(asyncFunction.future(null, 2, 3));
            futures.push(asyncFunction.future(null, 2, 3));
        }, function(err){
            if (err) return console.error(err);
            try {
                while (futures.length) assert.ok(futures.shift().resolved);
            }
            catch (e) {
                console.error(e);
            }
        })
        
        // Test timeout
        var future = asyncFunctionTimeout.future(null, 100);
        future.timeout = 200;
        // check future result
        assert.equal(future.result, 'result');
        // check error
        assert.strictEqual(future.error, null);
        
        // Test timeout error
        var future = asyncFunctionTimeout.future(null, 100);
        future.timeout = 50;
        
        assert.throws(function(){
            future.result;
        }, 'future should throw timeout exception')
        
        // check error
        assert.ok(future.error instanceof Error);
        assert.ok(~future.error.stack.indexOf(__filename));
    
        // test straight Sync.Future timeout usage
        asyncFunctionTimeout(100, future = new Sync.Future(200));
        // check error
        assert.strictEqual(future.error, null);
        // check future result
        assert.equal(future.result, 'result');
        
        // test straight Sync.Future timeout error
        asyncFunctionTimeout(100, future = new Sync.Future(50));
        assert.throws(function(){
            future.result;
        }, 'future should throw timeout exception')
        
        // check error
        assert.ok(future.error instanceof Error);
        assert.ok(~future.error.stack.indexOf(__filename));
        
        // TODO: test multiple future calls with errors
        return;
        
        var foo = function(a, b, callback)
        {
            process.nextTick(function(){
                callback('error');
            })
        }
        
        var fn = function()
        {
            var future = foo.future(null, 2, 3);
            var future2 = foo.future(null, 2, 3);
            console.log('x');
            var a = future.result;
            console.log('y');
            var b = future2.result;
            
        }.async()
        
        Sync(function(){
            
            try {
                fn.sync();
            }
            catch (e) {
                console.log('catched', e.stack);
            }
            
        }, function(err){
            if (err) console.error('hehe', err);
        })
    
    }, function(e){
        if (e) {
            console.error(e.stack);
        }
        if (callback) {
            callback(e);
        }
    })
}

if (!module.parent) {
    runTest(function(){
        console.log('%s done', __filename);
    });
}

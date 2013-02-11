
/**
 * Tests for Function.prototype.async
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

// Simple synchronous function
function syncFunction(a, b) {
    return asyncFunction.sync(null, a, b);
}

// Simple synchronous function throws an exception
function syncFunctionThrowsException(a, b) {
    throw 'something went wrong';
}

// test object
var testObject = {
    
    property : 2,
    
    syncMethod : function someAsyncMethod(b) {
        return asyncFunction.sync(null, this.property, b);
    },
    
    syncMethodThrowsException : function someAsyncMethodThrowsException(b) {
        throw 'something went wrong';
    }
}

var runTest = module.exports = function(callback)
{
    var e;
    
    try {
        
        // test on returning value
        var syncFunctionAsync = syncFunction.async();
        syncFunctionAsync(2, 3, function(err, result){
            assert.equal(result, 2 + 3);
        })
    
        // test on throws exception
        var syncFunctionThrowsExceptionAsync = syncFunctionThrowsException.async();
        syncFunctionThrowsExceptionAsync(2, 3, function(err, result){
            assert.equal(err, 'something went wrong');
        })
        
        // test on throws exception when call without callback
        /*var syncFunctionAsync = syncFunction.async();
        assert.throws(function(){
            syncFunctionAsync(2, 3);
        }, 'Missing callback as last argument to async function');*/
        
        // test on working synchronously within a Fiber
        Fiber(function(){
            var result = syncFunctionAsync(2, 3);
            assert.equal(result, 5);
        }).run()
        
        // test on working synchronously within a Fiber with object context
        Fiber(function(){
            testObject.syncMethodAuto = testObject.syncMethod.async();
            var result = testObject.syncMethodAuto(3);
            assert.equal(result, testObject.property + 3);
        }).run()
        
        // test running in a same fiber
        Fiber(function(){
            var fiber = Fiber.current;
            (function(){
                assert.ok(Fiber.current instanceof Fiber);
                assert.strictEqual(Fiber.current, fiber);
            }).async()();
        }).run()
    
        // test on returning value with object context
        var syncMethodAsync = testObject.syncMethod.async(testObject);
        syncMethodAsync(3, function(err, result){
            try {
                assert.equal(result, testObject.property + 3);
            }
            catch (e){
                console.error(e.stack);
            }
        })

        // test automatic context assignment
        testObject.syncMethodAuto = testObject.syncMethod.async();
        testObject.syncMethodAuto(3, function(err, result){
            assert.equal(result, testObject.property + 3);
        })
    
        // test on throws exception with object context
        var syncMethodThrowsExceptionAsync = testObject.syncMethodThrowsException.async(testObject);
        syncMethodThrowsExceptionAsync(3, function(err, result){
            assert.equal(err, 'something went wrong');
        })
        
        // Test async call with .sync()
        Fiber(function(){
            var syncFunctionAsync = syncFunction.async();
            var result = syncFunctionAsync.sync(null, 2, 3);
            assert.equal(result, 2 + 3);
        }).run()
        
        // Test async call with .sync() throwing exception
        Fiber(function(){
            var syncFunctionThrowsExceptionAsync = syncFunctionThrowsException.async();
            assert.throws(function(){
                syncFunctionThrowsExceptionAsync.sync(null, 2, 3);
            }, 'something went wrong');
        }).run()
        
        // Test async call with .sync() with object context 1
        Fiber(function(){
            var syncMethodAsync = testObject.syncMethod.async(testObject);
            var result = syncMethodAsync.sync(testObject, 3);
            assert.equal(result, testObject.property + 3);
        }).run()
        
        // Test async call with .sync() with object context 2
        Fiber(function(){
            var syncMethodAsync = testObject.syncMethod.async(testObject);
            var result = syncMethodAsync.sync(null, 3);
            assert.equal(result, testObject.property + 3);
        }).run()
        
        // Test async call with .future()
        Sync(function(){
            var syncFunctionAsync = syncFunction.async();
            var future = syncFunctionAsync.future(null, 2, 3);
            assert.equal(future.result, 2 + 3);
        }, function(err){
            if (err) console.error(err);
        })

        // Test async call with .future() throwing exception
        Sync(function(){
            var syncFunctionThrowsExceptionAsync = syncFunctionThrowsException.async();
            assert.throws(function(){
                var future = syncFunctionThrowsExceptionAsync.future(null, 2, 3);
                future.result;
            }, 'something went wrong');
        }, function(err){
            if (err) console.error(err);
        })

        // Test async call with .future() with object context
        Sync(function(){
            var syncMethodAsync = testObject.syncMethod.async(testObject);
            var future = syncMethodAsync.future(testObject, 3);
            assert.equal(future.result, testObject.property + 3);
        }, function(err){
            if (err) console.error(err);
        })

        // Test async call with .future() with object context 2
        Sync(function(){
            var syncMethodAsync = testObject.syncMethod.async(testObject);
            var future = syncMethodAsync.future(null, 3);
            assert.equal(future.result, testObject.property + 3);
        }, function(err){
            if (err) console.error(err);
        })
        
        // Test async call in the same fiber
        Sync(function(){
            
            var result;
            
            var someSyncFunction = function() {
                
                result = asyncFunction.sync(null, 2, 3);
                
            }.async()
            
            var fiber = Fiber.current;
            
            process.nextTick(function(){
                someSyncFunction();
                
                process.nextTick(function(){
                    fiber.run();
                })
            })
            
            Fiber.yield();
            
            assert.equal(result, 5);
            
        }, function(err){
            if (err) console.error(err);
        })
        
    }
    catch (e) {
        console.error(e.stack);
    }
    
    if (callback) {
        callback(e);
    }
}

if (!module.parent) {
    runTest(function(){
        console.log('%s done', __filename);
    });
}

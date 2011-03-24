require.paths.unshift(__dirname + '/../lib');

/**
 * Tests for Function.prototype.future
 */

var Sync = require('sync'),
    assert = require('assert');

// Simple asynchronous function
function asyncFunction(a, b, callback) {
    process.nextTick(function(){
        callback(null, a + b);
    })
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

// Asynchronous which returns multiple arguments to a callback
function asyncFunctionMultipleArguments(a, b, callback) {
    process.nextTick(function(){
        callback(null, a, b);
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
    },
    
    asyncMethodMultipleArguments : function asyncMethodMultipleArguments(b, callback) {
        var self = this;
        process.nextTick(function(){
            callback(null, self.property, b);
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
        // check future result
        assert.equal(future.result, 2 + 3);
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
        assert.ok(future.error instanceof Error);
        
        // test returning multiple arguments
        var future = asyncFunctionMultipleArguments.future(null, 2, 3);
        assert.deepEqual(future.result, [2, 3]);
        
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
        
        // test returning multiple arguments with object context
        var future = testObject.asyncMethodMultipleArguments.future(testObject, 3);
        assert.deepEqual(future.result, [testObject.property, 3]);
    
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
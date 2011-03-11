require.paths.unshift(__dirname + '/../lib');

/**
 * Tests for Function.prototype.sync
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
    Sync.Fiber(function(){
    
        // test on returning value
        var result = asyncFunction.sync(null, 2, 3);
        assert.equal(result, 2 + 3);
    
        // test on throws exception
        assert.throws(function(){
            var result = asyncFunctionThrowsException.sync(null, 2, 3);
        }, 'something went wrong');
    
        // test returning multiple arguments
        var result = asyncFunctionMultipleArguments.sync(null, 2, 3);
        assert.deepEqual(result, [2, 3]);
    
        // test on returning value with object context
        var result = testObject.asyncMethod.sync(testObject, 3);
        assert.equal(result, testObject.property + 3);
    
        // test on throws exception with object context
        assert.throws(function(){
            var result = testObject.asyncMethodThrowsException.sync(testObject, 2);
        }, 'something went wrong');
    
        // test returning multiple arguments with object context
        var result = testObject.asyncMethodMultipleArguments.sync(testObject, 3);
        assert.deepEqual(result, [testObject.property, 3]);
    
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
    runTest();
    console.log('%s done', __filename);
}

/**
 * Tests for Function.prototype.sync
 */

var Sync = require('..'),
    assert = require('assert');

// Simple asynchronous function
function asyncFunction(a, b, callback) {
    process.nextTick(function(){
        callback(null, a + b);
    })
}

// Simple asynchronous function which invokes callback in the same tick
function asyncFunctionSync(a, b, callback) {
    callback(null, a + b);
}

// Simple asynchronous function returning a value synchronously
function asyncFunctionReturningValue(a, b, callback) {
    process.nextTick(function(){
        callback(null, a + b);
    })
    return 123;
}

// Asynchronous which returns multiple arguments to a callback and returning a value synchronously
function asyncFunctionReturningValueMultipleArguments(a, b, callback) {
    process.nextTick(function(){
        callback(null, a, b);
    })
    return 123;
}

// Simple asynchronous function which throws an exception
function asyncFunctionThrowsException(a, b, callback) {
    process.nextTick(function(){
        callback('something went wrong');
    })
}

// Simple asynchronous function which throws an exception in the same tick
function asyncFunctionThrowsExceptionSync(a, b, callback) {
    callback('something went wrong');
}

// Simple asynchronous function which throws an exception and returning a value synchronously
function asyncFunctionReturningValueThrowsException(a, b, callback) {
    process.nextTick(function(){
        callback('something went wrong');
    })
    return 123;
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
        var result = asyncFunction.syncnull(2, 3);
        assert.equal(result, 2 + 3);

        // test on returning value in the same tick
        var result = asyncFunctionSync.syncnull(2, 3);
        assert.equal(result, 2 + 3);

        // test on throws exception
        assert.throws(function(){
            var result = asyncFunctionThrowsException.syncnull(2, 3);
        }, 'something went wrong');

        // test on throws exception in the same tick
        assert.throws(function(){
            var result = asyncFunctionThrowsExceptionSync.syncnull(2, 3);
        }, 'something went wrong');

        // test asynchronous function should not return a synchronous value
        var result = asyncFunctionReturningValue.syncnull(2, 3);
        assert.equal(result, 2 + 3);

        // test returning multiple arguments
        var result = asyncFunctionMultipleArguments.syncnull(2, 3);
        assert.deepEqual(result, [2, 3]);

        // test asynchronous function should not return a synchronous value (multiple arguments)
        var result = asyncFunctionReturningValueMultipleArguments.syncnull(2, 3);
        assert.deepEqual(result, [2, 3]);

        // test asynchronous function should not return a synchronous value (throwing exception)
        assert.throws(function(){
            var result = asyncFunctionReturningValueThrowsException.syncnull(2, 3);
        }, 'something went wrong');

        // test asynchronous which calls callback twice (should not be called twice)
        var result = asyncFunctionCallbackTwice.syncnull(2, 3);
        assert.equal(result, 2 + 3);

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

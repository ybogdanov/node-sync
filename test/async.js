require.paths.unshift(__dirname + '/../lib');

/**
 * Tests for Function.prototype.async
 */

var Sync = require('sync'),
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
        var syncFunctionAsync = syncFunction.async();
        assert.throws(function(){
            syncFunctionAsync(2, 3);
        }, 'Missing callback as last argument to async function');
        
        // test on working synchronously within a Fiber
        Sync.Fiber(function(){
            var result = syncFunctionAsync(2, 3);
            assert.equal(result, 5);
        })
    
        // test on returning value with object context
        var syncMethodAsync = testObject.syncMethod.async(testObject);
        syncMethodAsync(3, function(err, result){
            assert.equal(result, testObject.property + 3);
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
    }
    catch (e) {
        console.error(e.stack);
    }
    
    if (callback) {
        callback(e);
    }
}

if (!module.parent) {
    runTest();
    console.log('%s done', __filename);
}
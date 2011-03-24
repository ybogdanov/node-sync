require.paths.unshift(__dirname + '/../lib');

/**
 * Tests for Sync.Parallel
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

var runTest = module.exports = function(callback)
{
    Sync(function(){
    
        // Test parallel with no callbacks inside
        // should continue evaluating
        Sync.Parallel(function(){})
        
        // Test if an exception will be thrown inside
        assert.throws(function(){
            Sync.Parallel(function(){
                throw 'something went wrong';
            })
        }, 'something went wrong')
        
        // Test callback is correct
        Sync.Parallel(function(callback){
            assert.equal(typeof callback, 'function');
        })
        
        // Test one call
        var result = Sync.Parallel(function(callback){
            asyncFunction(2, 3, callback());
        })
        assert.deepEqual(result, [5]);
        
        // Test two calls
        var result = Sync.Parallel(function(callback){
            asyncFunction(2, 3, callback());
            asyncFunction(5, 5, callback());
        })
        assert.deepEqual(result, [5, 10]);
        
        // Test throws an exception
        assert.throws(function(){
            Sync.Parallel(function(callback){
                asyncFunctionThrowsException(2, 3, callback());
            })
        }, 'something went wrong');
        
        // Test associative return with one call
        var result = Sync.Parallel(function(callback){
            asyncFunction(2, 3, callback('foo'));
        })
        assert.deepEqual(result, {foo : 5});
        
        // Test associative return with two calls
        var result = Sync.Parallel(function(callback){
            asyncFunction(2, 3, callback('foo'));
            asyncFunction(5, 5, callback('bar'));
        })
        assert.deepEqual(result, {foo : 5, bar : 10});
        
        // Test throws an exception when mix associative return with numerical
        assert.throws(function(){
            Sync.Parallel(function(callback){
                asyncFunction(2, 3, callback('foo'));
                asyncFunction(5, 5, callback()); // lacks assoc here
            })
        });
    
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
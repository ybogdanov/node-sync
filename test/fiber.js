require.paths.unshift(__dirname + '/../lib');

/**
 * Tests for Sync.Fiber function
 */

var Sync = require('sync'),
    assert = require('assert');

var runTest = module.exports = function(callback)
{
    var e;
    
    try {
        // Test returning value
        Sync.Fiber(function(){
            return 'some value';
        }, function(err, value){
            assert.equal(value, 'some value');
        })

        // Test throws an exception
        Sync.Fiber(function(){
            throw 'something went wrong';
        }, function(err){
            assert.equal(err, 'something went wrong');
        })
        
        // Test fiber passing
        Sync.Fiber(function(fiber){
            assert.ok(fiber instanceof Fiber);
        })

        // Test without callback
        assert.doesNotThrow(function(){
            Sync.Fiber(function(){
                return 'test';
            })
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
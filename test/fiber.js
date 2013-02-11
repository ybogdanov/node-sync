
/**
 * Tests for Sync function
 */

var Sync = require('..'),
    Fiber = require('fibers'),
    assert = require('assert');

var runTest = module.exports = function(callback)
{
    var e;
    
    try {
        
        // Test returning value
        Sync(function(){
            return 'some value';
        }, function(err, value){
            assert.equal(value, 'some value');
        })

        // Test throws an exception
        Sync(function(){
            throw 'something went wrong';
        }, function(err){
            assert.equal(err, 'something went wrong');
        })

        // Test throws exception without callback
        // Update: do not throw exception if no callback
        // assert.throws(function(){
        //     Sync(function(){
        //         throw 'something went wrong';
        //     })
        // }, 'something went wrong');
        
        // Test callback throws exception
        assert.throws(function(){
            Sync(function(){

            }, function(){
                throw 'something went wrong';
            })
        }, 'something went wrong');
        
        // Test fiber passing
        Sync(function(fiber){
            assert.ok(fiber instanceof Fiber);
        })

        // Test without callback
        assert.doesNotThrow(function(){
            Sync(function(){
                return 'test';
            })
        })
        
        // Test backwards capability
        Sync.Fiber(function(){
            return 'some value';
        }, function(err, value){
            assert.equal(value, 'some value');
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

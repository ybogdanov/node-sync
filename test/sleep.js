
/**
 * Tests for Sync.sleep function
 */

var Sync = require('..'),
    assert = require('assert');

var runTest = module.exports = function(callback)
{
    var e;
    
    try {
        // Test sleeping correctly
        Sync(function(){
            var start = new Date;
            Sync.sleep(101); // sleep on 100 ms
            
            assert.ok(new Date - start >= 100);
        })
        
        // Test throws exception when callend not insode of fiber
        assert.throws(function(){
            Sync.sleep(1000);
        }, 'should throw exception when callend not inside of fiber')
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


require.paths.unshift(__dirname + '/../lib');

/**
 * Simple benchmark which compares eventloop speed with Fibers sync
 *
 * On Macbook Pro 2.2 GHz Core 2 Duo (node v0.4.2, node-fibers v0.2.2):
 * Event-loop took 2294 ms
 * Sync took 600 ms
 */

var Sync = require('sync');

function sum(a, b, callback) {
    callback(null, a + b);
}

var max = 1000000;

function loop(i, callback) {
    sum(3, 4, function(){
        if (i < max) {
            process.nextTick(function(){
                loop(i + 1, callback);
            })
        }
        else {
            callback();
        }
    })
}

var start = new Date();
loop(0, function(){
    console.log('Event-loop took %d ms', (new Date - start))
    
    // Test sync
    Sync(function(){
        var start = new Date();
        for(var i = 0; i <= max; i++) {
            sum.sync(null, 3, 4);
        }
        console.log('Sync took %d ms', (new Date - start))
    })
});


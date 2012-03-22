

/**
 * Simple benchmark which compares eventloop speed with Fibers sync
 *
 * On Macbook Pro 2.2 GHz Core 2 Duo (node v0.4.8, node-fibers v0.5.1):
 * Event-loop took 219 ms
 * Sync took 673 ms
 */

var Sync = require('..');

function sum(a, b, callback) {
    process.nextTick(function(){
        callback(null, a + b);
    })
}

var max = 100000;

function loop(i, callback) {
    sum(3, 4, function(){
        if (i < max) {
            loop(i + 1, callback);
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




/**
 * Simple benchmark which compares eventloop speed with Fibers sync
 *
 * On Macbook Pro | 2.66 GHz i7 | DDR3 1067 MHz | OSX 10.7.3 | node v0.6.18, node-fibers v0.6.8
 * Event-loop took 167 ms
 * Sync took 492 ms (x2)
 * Fiber took 429 ms (x2)
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
    var nativeTime = new Date - start;
    console.log('Event-loop took %d ms', nativeTime);
    
    // Test sync
    Sync(function(){
        var start = new Date();
        for(var i = 0; i <= max; i++) {
            sum.sync(null, 3, 4);
        }
        var syncTime = new Date - start;
        console.log('Sync took %d ms (x%d)', syncTime, ~~ (syncTime / nativeTime));

        // Test Fibers
        Fiber(function(){
            var f = Fiber.current;
            var start = new Date();
            for(var i = 0; i <= max; i++) {
                sum(3, 4, function() {
                    f.run();
                });
                Fiber.yield();
            }
            var fiberTime = new Date - start;
            console.log('Fiber took %d ms (x%d)', fiberTime, ~~ (fiberTime / nativeTime));
        }).run();
    })
});


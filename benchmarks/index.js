

/**
 * Simple benchmark which compares eventloop speed with Fibers sync
 * 
 * Note: Using process.nextTick in sum() function is not represents the real
 *       situation. In real live our we use I/O with external sources like
 *       network or fs. There's no need to use Sync/Fibers with code without I/O.
 *       So, even if we change process.nextTick to setTimeout() on 3 ms, the result
 *       will be almost same as native one, because asynchronous function time will
 *       seriously reduce Sync/Fibers wrapper cost.
 *
 *       The more I/O in your app, the cheaper cost of Fibers.
 *
 * On Macbook Pro | 2.66 GHz i7 | DDR3 1067 MHz | OSX 10.7.3 | node v0.6.18, node-fibers v0.6.8
 * 
 *     Event-loop took 163 ms
 *     Sync took 486 ms (x2)
 *     Futures took 7216 ms (x44)
 *     async() took 542 ms (x3)
 *     async().sync() took 468 ms (x2)
 *     Fibers.future took 1452 ms (x8)
 *     Fiber took 422 ms (x2)
 *
 * REAL result:
 *
 *     Event-loop took 354 ms
 *     Sync took 361 ms (x1)
 *     Futures took 370 ms (x1)
 *     async() took 353 ms (x0)
 *     async().sync() took 351 ms (x0)
 *     Fibers.future took 350 ms (x0)
 *     Fiber took 350 ms (x0)
 */

var Sync = require('..');

var max = 100000;

function sum(a, b, callback) {
    process.nextTick(function(){
        callback(null, a + b);
    });
}

var sumAsync = function (a, b, callback) {
    var f = Fiber.current;
    process.nextTick(function(){
        f.run(a + b);
    });
    Fiber.yield();
}.async();

/* REAL
var max = 100;

var sum = function(a, b, callback) {
    setTimeout(function(){
        callback(null, a + b);
    }, 3);
}

var sumAsync = function (a, b, callback) {
    var f = Fiber.current;
    setTimeout(function(){
        f.run(a + b);
    }, 3);
    Fiber.yield();
}.async();

*/

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

        var start = new Date();
        for(var i = 0; i <= max; i++) {
            sum.future(null, 3, 4).yield();
        }
        var futureTime = new Date - start;
        console.log('Futures took %d ms (x%d)', futureTime, ~~ (futureTime / nativeTime));

        var start = new Date();
        for(var i = 0; i <= max; i++) {
            sumAsync(3, 4);
        }
        var asyncTime = new Date - start;
        console.log('async() took %d ms (x%d)', asyncTime, ~~ (asyncTime / nativeTime));

        var start = new Date();
        for(var i = 0; i <= max; i++) {
            sumAsync.sync(null, 3, 4);
        }
        var asyncSyncTime = new Date - start;
        console.log('async().sync() took %d ms (x%d)', asyncSyncTime, ~~ (asyncSyncTime / nativeTime));

        var Future = require('fibers/future');
        var sumFuture = Future.wrap(sum);
        var start = new Date();
        for(var i = 0; i <= max; i++) {
            Future.wait(sumFuture(3, 4));
        }
        var fibersFutureTime = new Date - start;
        console.log('Fibers.future took %d ms (x%d)', fibersFutureTime, ~~ (fibersFutureTime / nativeTime));

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


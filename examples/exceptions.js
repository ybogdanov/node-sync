
/**
 * This example shows how you can deal with exceptions handling with Sync library
 */

var Sync = require('..');

// Simple asynchronous function which returns and error to a callback
// look at examples/simple.js to see how someAsyncFunction works normally
function someAsyncFunction(a, b, callback) {
    setTimeout(function(){
        callback('something went wrong');
    }, 1000)
}

// Here we need to start new Fiber inside of which we can do our tests
Sync(function(){
    try {
        var result = someAsyncFunction.sync(null, 2, 3);
    }
    catch (e) {
        console.error(e); // will print 'something went wrong' after 1 sec
    }
})

/**
 * Another example shows how Sync throws an exception to a callback
 * if some error occured inside of 'fn' body
 * look at examples/fiber.js for more details about Sync
 */

// Simple asynchronous function with fiber inside and throws an exception
function someFiberAsyncFunction(file, callback) {
    Sync(function(){
        throw new Error('something went wrong again');
    }, callback)
}

// Call someAsyncFunction in a normal asynchronous way
someFiberAsyncFunction(__filename, function(err, source){
    if (err) return console.error(err); // will print 'something went wrong again'
})

// Another example is synchronous function which can be called only inside of a fiber
// and throws an exception inside of it's body
var someSyncFunction = function(file) {
    throw new Error('something went wrong synchronously');
}.async() // <-- Turn someSyncFunction to asynchronous one

// call it in asynchronous way
someSyncFunction(__filename, function(err, source){
    if (err) return console.error(err); // will print 'something went wrong synchronously'
})

/**
 * Exceptions inside of a Sync.Future
 * see examples/future.js for more details about Sync.Future
 */
Sync(function(){
    
    // Here we need to call someAsyncFunction two times with different arguments in parallel
    // but wait for both results and only then continue
    try {
        var result1 = someAsyncFunction.future(null, 2, 2),
            result2 = someAsyncFunction.future(null, 3, 3);
        result1.yield();
        result2.yield();
    }
    catch (e) {
        console.error(e); // will print 'something went wrong' after 1 sec
    }
})


require.paths.unshift(__dirname + '/../lib');

/**
 * Future example
 */

var Sync = require('sync');

// Simple asynchronous function example
function someAsyncFunction(a, b, callback) {
    setTimeout(function(){
        callback(null, a + b);
    }, 1000)
}

// Here we need to start new Fiber inside of which we can do our tests
Sync(function(){
    
    // no-yield here
    var result = someAsyncFunction.future(null, 2, 3);
    var result2 = someAsyncFunction.future(null, 4, 4);
    console.log(result); // [Function: Future] - immediately
    
    // Yield here
    console.log(result.value, result2.value); // '5' after 1 sec
    
})

/**
 * This example shows how we can use Fibers in a single peaces of code,
 * without wrapping whole application to it
 *
 * look at examples/simple.js to see the difference in someAsyncFunction
 */
 
var Sync = require('..');

// Simple asynchronous function with fiber inside example
function someAsyncFunction(file, callback) {
    // Here we just wrap the function body to make it synchronous inside
    // Sync will execute first argument 'fn' in synchronous way
    // and call second argument 'callback' when function returns
    // it also calls callback if exception will be thrown inside of 'fn'
    Sync(function(){
        var source = require('fs').readFile.sync(null, __filename);
        return source;
    }, callback)
}

// Here we call someAsyncFunction in a normal asynchronous way
someAsyncFunction(__filename, function(err, source){
    if (err) return console.error(err);
    console.log(String(source)); // prints the sources of __filename
})

// Another example is synchronous function which can be called only inside of a fiber
// Here we need to turn someSyncFunction to asynchronous one, to call it outside of a Fiber
// note that .async() method receives 'this' context as first argument and returns new async function instance
// also if someSyncFunction will throw an exception it will trap into a callback as first argument
var someSyncFunction = function(file) {
    var source = require('fs').readFile.sync(null, __filename);
    return source;
}.async() // <-- look here

// call it in asynchronous way
someSyncFunction(__filename, function(err, source){
    if (err) return console.error(err);
    console.log(String(source)); // prints the sources of __filename
})


/**
 * This simple example shows how you can run ANY asynchronous function in synchronous manner
 */

var Sync = require('..');

// Simple asynchronous function example
function someAsyncFunction(a, b, callback) {
    setTimeout(function(){
        callback(null, a + b);
    }, 1000)
}

// Here we need to start new Fiber inside of which we can do our tests
Sync(function(){
    
    // Here we just need to call the method .sync() for synchronous behavior
    // (first argument to sync is an object context, we don't need it in this case)
    // the 'result' variable will be assigned only after function will return value
    var result = someAsyncFunction.sync(null, 2, 3);
    console.log(result); // 5
    
    // Note: thanks to pthreads, other code of the process can
    // be executed normally while we are waiting for result of someAsyncFunction
    // for example, fs.readFileSync blocks whole process, but with .sync() method we only block current thread:
    var source = require('fs').readFile.sync(null, __filename);
    console.log(String(source)); // prints the source of this example itself
    
})

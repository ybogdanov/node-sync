
require.paths.unshift(__dirname + '/../lib');

/**
 * Example shows how to use Sync.Parallel function which runs
 * all asynchronous functions inside of it's body and waits until all callbacks will be returned
 */

var Sync = require('sync');

// Some asynchronous function
function someAsyncFunction(a, b, callback) {
    setTimeout(function(){
        callback(null, a + b);
    }, 1000)
}

// Here we need to start new Fiber inside of which we can do our tests
Sync(function(){
    
    // Here we need to call someAsyncFunction two times with different arguments in parallel
    // but wait for both results and only then continue
    var results = Sync.Parallel(function(callback){
        someAsyncFunction(2, 2, callback());
        someAsyncFunction(5, 5, callback());
    });
    
    console.log(results); // [ 4, 10 ]
    
    // Associative results example
    var results = Sync.Parallel(function(callback){
        someAsyncFunction(2, 2, callback('foo')); // assign the result to 'foo'
        someAsyncFunction(5, 5, callback('bar')); // assign the result to 'bar'
    });
    
    console.log(results); // { foo: 4, bar: 10 }
})
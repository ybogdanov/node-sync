
/**
 * Future example
 * Shows how we can postpone yielding and call multiple functions in parallel
 * And then wait for all results in a single point
 *
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
            
    // no-yield here, call asynchronously
    // this functions executes in parallel
    var foo = someAsyncFunction.future(null, 2, 3);
    var bar = someAsyncFunction.future(null, 4, 4);
    
    // we are immediately here, no blocking
    
    // foo, bar - our tickets to the future!
    console.log(foo); // { [Function: Future] result: [Getter], error: [Getter] }
    
    // Yield here
    console.log(foo.result, bar.result); // '5 8' after 1 sec (not two)
    
    // Or you can straightly use Sync.Future without wrapper
    // This call doesn't blocks
    someAsyncFunction(2, 3, foo = new Sync.Future());
    
    // foo is a ticket
    console.log(foo); // { [Function: Future] result: [Getter], error: [Getter] }

    // Wait for the result
    console.log(foo.result); // 5 after 1 sec

    /**
     * Timeouts
     */

    // someAsyncFunction returns the result after 1000 ms
    var foo = someAsyncFunction.future(null, 2, 3);
    // but we can wait only 500ms!
    foo.timeout = 500;

    try {
        var result = foo.result;
    }
    catch (e) {
        console.error(e.stack); // Future function timed out at 500 ms
    }

    // Same example with straight future function
    someAsyncFunction(2, 3, foo = new Sync.Future(500));

    try {
        var result = foo.result;
    }
    catch (e) {
        console.error(e.stack); // Future function timed out at 500 ms
    }
})

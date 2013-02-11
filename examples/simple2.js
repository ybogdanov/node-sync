
/**
 * This simple example shows how you can use synchronous function that uses Fibers in asynchronous environment
 */

var Sync = require('..');

// Simple synchronous function example
var someSyncFunction = function(a, b)
{
    // It uses yield!
    var fiber = Fiber.current;
    
    setTimeout(function(){
        fiber.run(a + b);
    }, 1000);
    
    return yield();
    
}.async() // <-- ATTENTION: here we make this function asynchronous

// Here, in regular asynchronous environment we just call this function normally
someSyncFunction(2, 3, function(err, result){
    console.log(result); // will print '5' after 1 sec
})

// It also may throw and exception
var someSyncFunctionThrowingException = function() {
    throw 'something went wrong';
}.async()

// Here, in regular asynchronous environment we just call this function normally
someSyncFunctionThrowingException(function(err){
    console.log(err); // will print 'something went wrong'
})

// If we try to call this function without callback, it will throw an error
try {
    var result = someSyncFunction(2, 3);
}
catch (e) {
    console.log(e); // 'Missing callback as last argument to async function'
}

// But if we call this function from within synchronous environment (inside of a Fiber), it will run!
Sync(function(){
    var result = someSyncFunction(2, 3);
    console.log(result); // will print '5' after 1 sec
})

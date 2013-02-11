
/**
 * Example demonstrates that Fibers does not block whole process while yielding
 */

var Sync = require('..');

// Some asynchronous function
function someAsyncFunction(a, b, callback) {
    setTimeout(function(){
        callback(null, a + b);
    }, 1000)
}

// Simply print message after 500ms in main loop
setTimeout(function(){
    console.log('500 ms')
}, 500)

// Here we need to start new Fiber inside of which we can do our tests
Sync(function(){
    
    // Call the function synchronously
    // current fiber will yield for 1 sec, so it should be returned later than Timeout above
    var result = someAsyncFunction.sync(null, 2, 3);
    console.log(result); // will print 5
})


/**
 * Example demonstrates how you can use Function.prototype.async() to use any
 * prototype function synchronously - transparently binded current object to it
 */

var Sync = require('..');

// Simple asynchronous function
function asyncFunction(a, b, callback) {
    process.nextTick(function(){
        callback(null, a + b);
    })
}

// Example class with assigned value
function SomeClass(a) {
    this.a = a;
}

// Define prototype method in this class, which is synchronous inside
// just turn it to regular asynchronous function using Function.prototype.async()
// if we lack the first argument (context) it will transparently pass current object
// from which the function will be called
SomeClass.prototype.method = function(b) {
    return asyncFunction.sync(null, this.a, b);
}.async() // <-- look here

// Create instance passing 'a' value as argument
var obj = new SomeClass(2);

// Call our "synchronous" method asynchronously, passing second parameter 'b'
obj.method(3, function(err, result){
    console.log(result); // will print '5'
});

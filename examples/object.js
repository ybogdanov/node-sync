
/**
 * The example of some object which has a property and
 * asynchronous method which uses this.someProperty to get it's value
 * and we want to call this method synchronously
 */

var Sync = require('..');

// the object
var someObject = {
    
    someProperty : 2,
    
    someAsyncMethod : function someAsyncMethod(b, callback) {
        var self = this;
        setTimeout(function(){
            callback(null, self.someProperty + b);
        }, 1000)
    }
}

// Here we need to start new Fiber inside of which we can do our tests
Sync(function(){
    
    // Here we need to set 'this' context for someAsyncMethod
    // It will add passed argument to someObject.someProperty and return the result
    // It's works the same way as Function.prototyle.call
    var result = someObject.someAsyncMethod.sync(someObject, 3);
    console.log(result); // 5
    
})

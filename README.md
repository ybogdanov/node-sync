# Introduction
node-sync is a simple library that allows you to call any asynchronous function in synchronous way. The main benefit is that it uses javascript-native design - Function.prototype.sync function, instead of heavy APIs which you'll need to learn. Also, asynchronous function which was called synchronously through node-sync doesn't blocks the whole process - it blocks only current thread!

It built on [node-fibers](https://github.com/laverdet/node-fibers) library as a multithreading solution.

# Examples
Simply call asynchronous function synchronously:

```javascript
var Sync = require('sync');

function asyncFunction(a, b, callback) {
	process.nextTick(function(){
		callback(null, a + b);
	})
}

// Run in a fiber
Sync(function(){
	
	// Function.prototype.sync() interface is same as Function.prototype.call() - first argument is 'this' context
	var result = asyncFunction.sync(null, 2, 3);
	console.log(result); // 5

	// Read file synchronously without blocking whole process? no problem
	var source = require('fs').readFile.sync(null, __filename);
    console.log(String(source)); // prints the source of this example itself
})
```

It throws exceptions!

```javascript
var Sync = require('sync');

function asyncFunction(a, b, callback) {
	process.nextTick(function(){
		callback('something went wrong');
	})
}

// Run in a fiber
Sync(function(){

	try {
		var result = asyncFunction.sync(null, 2, 3);
	}
	catch (e) {
		console.error(e); // something went wrong
	}
})

// Or simply specify callback function for Sync fiber
// handy when you use Sync in asynchronous environment
Sync(function(){
	
	// The result will be passed to a Sync callback
	var result = asyncFunction.sync(null, 2, 3);
	return result;
	
}, function(err, result){ // <-- standard callback
	
	if (err) console.error(err); // something went wrong
	
	// The result which was returned from Sync body function
	console.log(result);
})
```

Transparent integration

```javascript
var Sync = require('sync');

var MyNewFunctionThatUsesFibers = function(a, b) { // <-- no callback here
	
	// we can use yield here
	// yield();
	
	// or throw an exception!
	// throw new Error('something went wrong');
	
	// or even sleep
	// Sync.sleep(200);
	
	// or turn fs.readFile to non-blocking synchronous function
	// var source = require('fs').readFile.sync(null, __filename)
	
	return a + b; // just return a value
	
}.async() // <-- here we make this function friendly with async environment

// Classic asynchronous nodejs environment
var MyOldFashoinAppFunction = function() {
	
	// We just use our MyNewFunctionThatUsesFibers normally, in a callback-driven way
	MyNewFunctionThatUsesFibers(2, 3, function(err, result){
		
		// If MyNewFunctionThatUsesFibers will throw an exception, it will go here
		if (err) return console.error(err);
		
		// 'return' value of MyNewFunctionThatUsesFibers
		console.log(result); // 5
	})
}

// From fiber environment
Sync(function(){
	
	// Run MyNewFunctionThatUsesFibers synchronously
	var result = MyNewFunctionThatUsesFibers(2, 3);
	console.log(result); // 5
	
	// Or use sync() for it (same behavior)
	var result = MyNewFunctionThatUsesFibers.sync(null, 2, 3);
	console.log(result); // 5
})
```

Parallel execution:

```javascript
var Sync = require('sync'),
	Future = Sync.Future();

// Run in a fiber
Sync(function(){
	try {
		// Three function calls in parallel
		var foo = asyncFunction.future(null, 2, 3);
		var bar = asyncFunction.future(null, 5, 5);
		var baz = asyncFunction.future(null, 10, 10);
	
		// We are immediately here, no blocking
	
		// foo, bar, baz - our tickets to the future!
	    console.log(foo); // { [Function: Future] result: [Getter], error: [Getter] }
	
		// Get the results
		// (when you touch 'result' getter, it blocks until result would be returned)
		console.log(foo.result, bar.result, baz.result); // 5 10 20
	
		// Or you can straightly use Sync.Future without wrapper
		// This call doesn't blocks
		asyncFunction(2, 3, foo = Future());
	
		// foo is a ticket
	    console.log(foo); // { [Function: Future] result: [Getter], error: [Getter] }

		// Wait for the result
		console.log(foo.result); // 5
	}
	catch (e) {
		// If some of async functions returned an error to a callback
		// it will be thrown as exception
		console.error(e);
	}
})
```
	
Timeouts support

```javascript	
var Sync = require('sync'),
	Future = Sync.Future;

function asyncFunction(a, b, callback) {
	setTimeout(function(){
		callback(null, a + b);
	}, 1000)
}

// Run in a fiber
Sync(function(){
	
	// asyncFunction returns the result after 1000 ms
	var foo = asyncFunction.future(null, 2, 3);
	// but we can wait only 500ms!
	foo.timeout = 500;

	try {
	    var result = foo.result;
	}
	catch (e) {
	    console.error(e); // Future function timed out at 500 ms
	}

	// Same example with straight future function
	asyncFunction(2, 3, foo = new Future(500));

	try {
	    var result = foo.result;
	}
	catch (e) {
	    console.error(e); // Future function timed out at 500 ms
	}
})
```

# How to address non-uniform callbacks
Sometimes third-party libraries are not following convention and passing multiple result parameters to the callback, e.g. `callback(err, recordsets, returnValue)`. In this situation, `node-sync` will simply return array of values instead of value.

```javascript
// Asynchronous which returns multiple arguments to a callback and returning a value synchronously
function asyncFunctionReturningMultipleArguments(callback) {
    process.nextTick(function(){
        callback(null, 2, 3);
    })
}

Sync(function(){
    var result = asyncFunctionReturningMultipleArguments.sync();
    assert.equal(result, [2, 3]);
})
```
	
See more examples in [examples](https://github.com/0ctave/node-sync/tree/master/examples) directory.

# Installation
install

```bash
$ npm install sync
```
and then

```bash
$ node your_file_using_sync.js
```

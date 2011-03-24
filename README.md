
# Introduction
node-sync is a simple library that allows you to call any asynchronous function in synchronous way. The main benefit is that it uses javascript-native design - Function.prototype.sync function, instead of heavy APIs which you'll need to learn. Also, asynchronous function which was called synchronously through node-sync doesn't blocks the whole process - it blocks only current thread!

It built on [node-fibers](https://github.com/laverdet/node-fibers) library as a multithreading solution.

You may also like [fibers-promise](https://github.com/lm1/node-fibers-promise) and [node-fiberize](https://github.com/lm1/node-fiberize) libraries.

# Examples
Simply call asynchronous function synchronously:
	function asyncFunction(a, b, callback) {
		process.nextTick(function(){
			callback(null, a + b);
		})
	}
	
	// Function.prototype.sync() interface is same as Function.prototype.call() - first argument is 'this' context
	var result = asyncFunction.sync(null, 2, 3);
	console.log(result); // 5
	
	// Read file synchronously without blocking whole process? no problem
	var source = require('fs').readFile.sync(null, __filename);
    console.log(String(source)); // prints the source of this example itself

It throws exceptions!
	function asyncFunction(a, b, callback) {
		process.nextTick(function(){
			callback('something went wrong');
		})
	}
	
	try {
		var result = asyncFunction.sync(null, 2, 3);
	}
	catch (e) {
		console.error(e); // something went wrong
	}

Parallel execution:
	var Parallel = require('sync').Parallel;
	
	// Parallel function will return values only when all callbacks will be executed
	var result = Parallel(function(callback){
		asyncFunction(2, 3, callback());
		asyncFunction(5, 5, callback());
		asyncFunction(10, 10, callback());
	});
	console.log(result); // [5, 10, 20]
	
	// Associative result
	var result = Parallel(function(callback){
		asyncFunction(2, 3, callback('foo'));
		asyncFunction(5, 5, callback('bar'));
		asyncFunction(10, 10, callback('baz'));
	});
	console.log(result); // { foo: 5, bar: 10, baz: 20 }
	
Future paradigm:
	// no-yield here, call asynchronously, so functions will be called in parallel
    var foo = someAsyncFunction.future(null, 2, 3);
    var bar = someAsyncFunction.future(null, 4, 4);
    
    // we are immediately here
    
    // foo, bar - our tickets to the future!
    console.log(foo); // { [Function: Future] result: [Getter], error: [Getter] }
    
    // Yield here
    console.log(foo.result, bar.result); // 5 8

See more examples in [examples](https://github.com/0ctave/node-sync/tree/master/examples) directory.

# Installation
install
	npm install sync
and then
	node-fibers your_file.js
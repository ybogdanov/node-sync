
/**
 * Tests suite - runs all tests
 */

var fs = require('fs');

var tests = ['fiber', 'sync', 'async', 'future', 'sleep'];
var i = 0;
tests.forEach(function(name){
    
    var test = require('./' + name);
    test(function(err){
        if (err) console.log('test %s failed', name);
        else console.log('%s passed', name);
        
        if (++i == tests.length) {
            console.log('done');
        }
    });
})

require.paths.unshift(__dirname + '/../lib');

/**
 * This simple example shows how you can easily pass variables across fibers tree
 * it's very useful when you have concurrent program (http server) which deals with a lot of simultenous requests
 * and you need to maintain the context (e.g. req, res variables) for each local execution stack
 * without passing it through function arguments endlessly
 *
 * In this example, the tree will be looking like:
 *
 * --> Request #1
 *     Fiber #1
 *         someGatewayMethod.future()
 *              Fiber #1.1
 *
 * --> Request #2
 *     Fiber #2
 *         someGatewayMethod.future()
 *              Fiber #2.1
 *
 * So, this program will output:
 * request #1
 * request #2
 */

var Sync = require('sync');

var someGatewayMethod = function() {
    
    var fiber = Fiber.current;
    setInterval(function(){
        console.log(fiber.req);
    }, 1000)
    
    
}.async()

// One fiber (e.g. user's http request)
Sync(function(){
    
    Fiber.current.req = 'request #1';
    
    // future() runs someGatewayMethod in a separate "forked" fiber
    someGatewayMethod.future();
})

// Another fiber (e.g. user's http request)
Sync(function(){
    
    Fiber.current.req = 'request #2';
    
    // future() runs someGatewayMethod in a separate "forked" fiber
    someGatewayMethod.future();
})
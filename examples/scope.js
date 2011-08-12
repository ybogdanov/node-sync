
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

var Sync = require('..');

var x = function() {
    
    //Sync.sleep(100);
    
    throw new Error('hehe');
    console.log(scope.req);

}.async();

var someGatewayMethod = function() {
    
    var scope = Sync.scope;
    
    //throw new Error('hehe');
    //Sync.sleep(100);
    
    //x.future();
    
    x.future();
    //x();
    
    return;
    
    setTimeout(function(){
        
        //console.log(Fiber.current)
        //throw new Error('hehe');
        
        var x = function() {
            
            throw new Error('hehe');
            console.log(scope.req);

        }.async();
        
        x.future();
        //x();
        
        
    }.async(), 100)
    
    
}.async()


// One fiber (e.g. user's http request)
Sync(function(){
    
    Sync.scope.req = 'request #1';
    
    // future() runs someGatewayMethod in a separate "forked" fiber
    someGatewayMethod.future();
    //someGatewayMethod();
    
    //console.log(f.error);
    
    //someGatewayMethod();
    //Sync.waitFutures();
    
}, Sync.log)

// Another fiber (e.g. user's http request)
/*Sync(function(){
    
    Sync.scope.req = 'request #2';
    
    // future() runs someGatewayMethod in a separate "forked" fiber
    someGatewayMethod.future();
})*/
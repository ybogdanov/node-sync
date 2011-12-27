
var Sync = require('../lib/sync');
    
Sync(function(){
    
    var r = Sync.repl('Sync repl > ');
    r.context.foo = 'bar';
    
}, Sync.log)
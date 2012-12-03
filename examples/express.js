var Sync = require('..'),
	express = require('express'),
	app = express();

app.get('/', function(req, res){
	// you can do .sync here!
	res.send('Hello Sync World!');
	return true; // ok
}.asyncMiddleware());

app.get('/404', function(req, res){
	return null; // next()
}.asyncMiddleware());

app.get('/404-2', function(req, res){
	// next()
}.asyncMiddleware());

app.get('/500', function(req, res){
	throw new Error("Something went wrong"); // next(new Error(...))
}.asyncMiddleware());

app.listen(3000);
console.log('App is listening on *:%d', 3000);

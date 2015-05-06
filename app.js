var express = require('express');
var bodyParser = require('body-parser');
var parseString = require('xml2js').parseString;

var app = express();

app.use(bodyParser.text({ type: 'text/plain' }));

app.get('/', function (req, res) {
	res.send('Hello World!');
});

app.post('/ccuevent', function (req, res) {
	console.log('Content-Type: ' + req.get('Content-Type'));
	console.log('Body:');
	console.log(req.body);
	
	parseString(req.body, function (err, result) {
	    console.log(result);
	    
	    var params = result.methodCall.params[0];
	    var id = params.param[0].value[0].string;
	    var aktor = params.param[1].value[0].string;
	    var datenpunkt = params.param[2].value[0].string;
	    var wert = params.param[3].value[0].boolean;

	    console.log('ID: %s, Aktor: %s, Datenpunkt: %s, Wert: %s', id, aktor, datenpunkt, wert);
	});
	
	res.send('Event stored!');
});

app.use('/public', express.static('public'));

var server = app.listen(8000, function () {

	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);
});
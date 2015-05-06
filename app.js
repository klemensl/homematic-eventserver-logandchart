var express = require('express');
var bodyParser = require('body-parser');
var parseString = require('xml2js').parseString;
var Sequelize = require('sequelize');
var moment = require('moment');
var http = require('http');

var app = express();
//var sequelize = new Sequelize('mysql://localhost:3306/ccu', 'node', 'node');
var sequelize = new Sequelize('ccu', 'node', 'node', {
	dialect: "mysql", // or 'sqlite', mysql', 'mariadb'
	port:    3306, // or 5432 (for postgres)
});

var Event;

app.use(bodyParser.text({ type: 'text/plain' }));

app.post('/init', function (req, res) {
	console.log('Dummy init...');
	console.log('Content-Type: ' + req.get('Content-Type'));
	console.log('Body:');
	console.log(req.body);
	res.send('OK!');
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

		Event.create({
			aktor: String(aktor),
			datenpunkt: String(datenpunkt),
			wert: String(wert),
			dauer: '123'
		}).then(function(event){
			console.log('Event created!');
		});

	});

	res.send('Event stored!');
});

//app.use('/public', express.static('public'));


sequelize.authenticate().then(function(err) {
	if (!!err) {
		console.log('Unable to connect to the database:', err);
	} else {
		console.log('Connection has been established successfully.');

		var server = app.listen(8000, function () {
			var host = server.address().address;
			var port = server.address().port;
			console.log('Example app listening at http://%s:%s', host, port);

			Event = sequelize.import(__dirname + "/models/event");
			Event.sync({force:false});


			var initPostBody = "<?xml version=\"1.0\"?>" +
			"<methodCall>" +
			"<methodName>init</methodName>" +
			"<params>" +
			"<param><value><string>http://192.168.1.1:8000/ccuevent</string></value></param>" +
			"<param><value><string>123456</string></value></param>" +
			"</params>" +
			"</methodCall>";

			var options = {
					host: '192.168.1.104',
					port: 8000,
					path: '/init',
					method: 'POST',
					headers: {
						'Content-Type': 'text/plain',
						'Content-Length': initPostBody.length
					}
			};

			var req = http.get(options, function(res) {
				console.log('STATUS: ' + res.statusCode);
				//console.log('HEADERS: ' + JSON.stringify(res.headers));

				// Buffer the body entirely for processing as a whole.
				/*var bodyChunks = [];
			  res.on('data', function(chunk) {
			    // You can process streamed parts here...
			    bodyChunks.push(chunk);
			  }).on('end', function() {
			    var body = Buffer.concat(bodyChunks);
			    console.log('BODY: ' + body);
			    // ...and/or process the entire body here.
			  });*/
			});

			req.on('error', function(e) {
				console.log('ERROR: ' + e.message);
			});
			req.write(initPostBody);
			req.end();
		});
	}
});


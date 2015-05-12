var express = require('express');
var bodyParser = require('body-parser');
var parseString = require('xml2js').parseString;
var Sequelize = require('sequelize');
var moment = require('moment');
//var http = require('http');
var request = require('request');
var ccuEventHandler = require('./util/CCUEventHandler');

var app = express();
//var sequelize = new Sequelize('mysql://localhost:3306/ccu', 'node', 'node');
var sequelize = new Sequelize('ccu', 'root', 'root', {
	dialect: "mysql", // or 'sqlite', mysql', 'mariadb'
	port:    3306, // or 5432 (for postgres)
});

var Event;

app.use(bodyParser.text({ type: 'text/xml' }));

app.post('/init', function (req, res) {
	console.log('Dummy init...');
	console.log('Content-Type: ' + req.get('Content-Type'));
	console.log('Body:');
	console.log(req.body);
	res.send('OK!');
});

app.get('/auswertung', function (req, res) {
	console.log('Content-Type: ' + req.get('Content-Type'));
	
	ccuEventHandler.auswertung(sequelize, Event, 'tag', function(data) {
		res.send(data);
	});
});

app.post('/ccuevent', function (req, res) {
	console.log('Content-Type: ' + req.get('Content-Type'));
	console.log('Body:');
	console.log(req.body);

	res.set('Content-Type', 'text/xml');
	parseString(req.body, function (err, requestBody) {
		try {
			var dataObject = new Object();
			if (requestBody.methodCall.methodName == 'listDevices') {
				res.send('<?xml version="1.0"?><methodCall><methodName>system.multicall</methodName><params><param><value><array><data><value><struct><member><name>ADDRESS</name><value>addresse</value></member><name>VERSION</name><value><i4>6</i4></value></member></struct></value></data></array></value></param></params></methodCall>');
				return;
			} else if (requestBody.methodCall.methodName == 'system.multicall') {
				console.log('Handling system.multicall');
				dataObject = ccuEventHandler.extractDataFromMultiCall(requestBody);
			} else if (requestBody.methodCall.methodName == 'event') {
				console.log('Handling simple event');
				dataObject = ccuEventHandler.extractDataFromSimpleEvent(requestBody);
			} else {
				console.log('Unknown methodName: ' + requestBody.methodCall.methodName);
				res.send('<?xml version="1.0"?><methodResponse><params><param><value>Unknown methodName!</value></param></params></methodResponse>');
				return;
			}

			console.log('ID: %s, Aktor: %s, Datenpunkt: %s, Wert: %s', dataObject.id, dataObject.aktor, dataObject.datenpunkt, dataObject.wert);

			Event.findOne({ where: {aktor: dataObject.aktor, datenpunkt: dataObject.datenpunkt}, order: 'timestamp DESC'}).then(function(event) {
				if ((event == null) || ((event != null) && (event.wert != dataObject.wert) && (dataObject.wert == '1'))) {
					Event.create({
						aktor: String(dataObject.aktor),
						datenpunkt: String(dataObject.datenpunkt),
						wert: String(dataObject.wert),
						dauer: '0'
					}).then(function(event){
						console.log('Event created!');
						res.send('<?xml version="1.0"?><methodResponse><params><param><value>Event stored!</value></param></params></methodResponse>');
					});
				} else if ((event != null) && (event.wert == dataObject.wert)) {
					console.log('Duplicate Event, NOT stored!');
					res.send('<?xml version="1.0"?><methodResponse><params><param><value>Duplicate Event, NOT stored!</value></param></params></methodResponse>');
				} else if (dataObject.wert == '0') {
					Event.findOne({ where: {aktor: dataObject.aktor, datenpunkt: dataObject.datenpunkt, wert: '1'}, order: 'timestamp DESC'}).then(function(event) {
						if (event == null) {
							console.log('No matching ON event found, NOT stored!');
							res.send('<?xml version="1.0"?><methodResponse><params><param><value>No matching ON event found, NOT stored!</value></param></params></methodResponse>');
						} else {
							console.log(event.get({
								plain: true
							}));

							var onTimeStamp = event.timestamp;
							console.log(onTimeStamp);
							var diff = Math.abs(new Date() - onTimeStamp) / 1000;

							Event.create({
								aktor: String(dataObject.aktor),
								datenpunkt: String(dataObject.datenpunkt),
								wert: String(dataObject.wert),
								dauer: String(diff)
							}).then(function(event){
								console.log('Event created!');
								res.send('<?xml version="1.0"?><methodResponse><params><param><value>Event stored!</value></param></params></methodResponse>');
							});
						}
					});
				}
			});
		} catch (e) {
			console.log('Error extracting event');
			res.send('<?xml version="1.0"?><methodResponse><params><param><value>Event NOT stored!</value></param></params></methodResponse>');
		}
	});
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


			/*var initPostBody = "<?xml version=\"1.0\"?>" +
			"<methodCall>" +
			"<methodName>init</methodName>" +
			"<params>" +
			"<param><value><string>http://192.168.1.1:8000/ccuevent</string></value></param>" +
			"<param><value><string>111111</string></value></param>" +
			"</params>" +
			"</methodCall>";

			request.post(
					{url:'http://192.168.1.104:2001',
						body : initPostBody,
						headers: {'Content-Type': 'text/xml'}
					},
					function (error, response, body) {        
						if (!error && response.statusCode == 200) {
							console.log(body);
						} else {
							console.log(error);
						}
					}
			);*/
		});
	}
});
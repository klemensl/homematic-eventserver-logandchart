var express = require('express');
var bodyParser = require('body-parser');
var parseString = require('xml2js').parseString;
var Sequelize = require('sequelize');
var moment = require('moment');
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

app.get('/auswertung/tag', function (req, res) {
	console.log('Content-Type: ' + req.get('Content-Type'));
	
	ccuEventHandler.auswertung(sequelize, Event, 'tag', function(data) {
		res.send(data);
	});
});

app.get('/auswertung/monat', function (req, res) {
	console.log('Content-Type: ' + req.get('Content-Type'));
	
	ccuEventHandler.auswertung(sequelize, Event, 'monat', function(data) {
		res.send(data);
	});
});

/*app.get('/devicelist', function(req, res) {
	res.set('Content-Type', 'text/xml');
	res.send("<?xml version=\"1.0\" encoding=\"ISO-8859-1\" ?><deviceList><device name='2Fach Aktor EssenBalkon' address='LEQ0883366' ise_id='1816' interface='BidCos-RF' device_type='HM-LC-Sw2-FM' ready_config='true'><channel name='Essen' type='26' address='LEQ0883366:1' ise_id='1841' direction='RECEIVER' parent_device='1816' index='1' group_partner='' aes_available='true' transmission_mode='DEFAULT' visible='true' ready_config='true' operate='true' /><channel name='Balkon' type='26' address='LEQ0883366:2' ise_id='1847' direction='RECEIVER' parent_device='1816' index='2' group_partner='' aes_available='true' transmission_mode='DEFAULT' visible='true' ready_config='true' operate='true' /></device><device name='2Fach Aktor Kueche' address='KEQ0926487' ise_id='1867' interface='BidCos-RF' device_type='HM-LC-Sw2-FM' ready_config='true'><channel name='Kueche' type='26' address='KEQ0926487:1' ise_id='1892' direction='RECEIVER' parent_device='1867' index='1' group_partner='' aes_available='true' transmission_mode='DEFAULT' visible='true' ready_config='true' operate='true' /><channel name='Kueche-Ambient' type='26' address='KEQ0926487:2' ise_id='1898' direction='RECEIVER' parent_device='1867' index='2' group_partner='' aes_available='true' transmission_mode='DEFAULT' visible='true' ready_config='true' operate='true' /></device><device name='2Fach Aktor Sicherungskasten' address='LEQ0236800' ise_id='1236' interface='BidCos-RF' device_type='HM-LC-Sw2-FM' ready_config='true'><channel name='Stiege' type='26' address='LEQ0236800:1' ise_id='1261' direction='RECEIVER' parent_device='1236' index='1' group_partner='' aes_available='true' transmission_mode='DEFAULT' visible='true' ready_config='true' operate='true' /><channel name='Gang' type='26' address='LEQ0236800:2' ise_id='1267' direction='RECEIVER' parent_device='1236' index='2' group_partner='' aes_available='true' transmission_mode='DEFAULT' visible='true' ready_config='true' operate='true' /></device><device name='Rollladen Atkor' address='LEQ1032184' ise_id='1777' interface='BidCos-RF' device_type='HM-LC-Bl1PBU-FM' ready_config='true'><channel name='Rollladen Kueche' type='36' address='LEQ1032184:1' ise_id='1806' direction='RECEIVER' parent_device='1777' index='1' group_partner='' aes_available='true' transmission_mode='DEFAULT' visible='true' ready_config='true' operate='true' /></device></deviceList>");
});*/

app.post('/ccuevent', function (req, res) {
	console.log('Content-Type: ' + req.get('Content-Type'));
	console.log('Body:');
	console.log(req.body);

	res.set('Content-Type', 'text/xml');
	parseString(req.body, function (err, requestXML) {
		try {
			var dataObject = {};
			if (requestXML.methodCall.methodName == 'listDevices') {
				res.send('<?xml version="1.0"?><methodCall><methodName>system.multicall</methodName><params><param><value><array><data><value><struct><member><name>ADDRESS</name><value>addresse</value></member><name>VERSION</name><value><i4>6</i4></value></member></struct></value></data></array></value></param></params></methodCall>');
				return;
			} else if (requestXML.methodCall.methodName == 'system.multicall') {
				console.log('Handling system.multicall');
				dataObject = ccuEventHandler.extractDataFromMultiCall(requestXML);
			} else if (requestXML.methodCall.methodName == 'event') {
				console.log('Handling simple event');
				dataObject = ccuEventHandler.extractDataFromSimpleEvent(requestXML);
			} else {
				console.log('Unknown methodName: ' + requestXML.methodCall.methodName);
				res.send('<?xml version="1.0"?><methodResponse><params><param><value>Unknown methodName!</value></param></params></methodResponse>');
				return;
			}

			console.log('ID: %s, Aktor: %s, Datenpunkt: %s, Wert: %s', dataObject.id, dataObject.aktor, dataObject.datenpunkt, dataObject.wert);

			ccuEventHandler.handleEvent(Event, dataObject, function(resultBody) {
				res.send(resultBody);
			});
		} catch (e) {
			console.log('Error extracting event');
			res.send('<?xml version="1.0"?><methodResponse><params><param><value>Event NOT stored!</value></param></params></methodResponse>');
		}
	});
});

app.use('/public', express.static('public'));


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
var parseString = require('xml2js').parseString;
var request = require('request');
var moment = require('moment');

var aktorNames = {};

function initializeAktorNames() {
	if (Object.keys(aktorNames).length === 0) {
		console.log('Aktoren noch nicht initialisiert...');

		request.get('http://192.168.1.104/config/xmlapi/devicelist.cgi', function (error, response, responseBody) {        
			if (!error && response.statusCode == 200) {
				parseString(responseBody, function (err, responseXML) {
					for (var i in responseXML.deviceList.device) {
						var channels = responseXML.deviceList.device[i].channel;
						for (var j in channels) {
							aktorNames[channels[j].$.address] = channels[j].$.name;
						}
					}
				});

				console.log(aktorNames);
			} else {
				console.log(error);
			}
		});
	}
}


function createChartDataFrom(events, zeitspanne) {
	initializeAktorNames();

	console.log("Event, gruppiert nach: " + zeitspanne);
	console.log(events);

	var labels = [];
	var datasetTitles = [];
	for (var i in events) {
		var event = events[i];
		console.log(event);

		if (labels.indexOf(event[zeitspanne]) == -1) {
			labels.push(event[zeitspanne]);
		}

		var aktorName = aktorNames[event.aktor] != undefined ? aktorNames[event.aktor] : event.aktor;
		if (datasetTitles.indexOf(aktorName) == -1) {
			datasetTitles.push(aktorName);
		}
	}

	var datasetData = [];
	for (var i in events) {
		var event = events[i];

		var aktorName = aktorNames[event.aktor] != undefined ? aktorNames[event.aktor] : event.aktor;
		if (datasetData.indexOf(aktorName) == -1) {
			datasetData.push(aktorName);
			datasetData[aktorName] = {data: []};

			for (var j in labels) {
				datasetData[aktorName].data.push(0);
			}
		}

		datasetData[aktorName].data[labels.indexOf(event[zeitspanne])] = Math.round(event.dauer / 60 / 60 * 10) / 10;
	}

	var datasets = [];
	for (var i in datasetTitles) {
		datasets.push({
			title: datasetTitles[i], //'title' in ChartNew.js und 'label' Charts.js
			data: datasetData[datasetTitles[i]].data,
			fillColor: "rgba(151,187,205,0.2)",
			strokeColor: "rgba(151,187,205,1)",
			pointColor: "rgba(151,187,205,1)",
			pointStrokeColor: "#fff",
			pointHighlightFill: "#fff",
			pointHighlightStroke: "rgba(151,187,205,1)"
		});
	}

	var resultObject = {
			labels: labels,
			datasets: datasets
	};

	return resultObject;
}

module.exports = {
		auswertung: function (sequelize, Event, zeitspanne, sumOrAverage, callback) {
			if (sumOrAverage == 'avg') {
				sequelize.query(
						'SELECT sub.aktor as aktor, sub.monat as monat, avg(sumdauer) as dauer FROM (SELECT aktor, monat, tag, sum(dauer) as sumdauer FROM ccu.event WHERE datenpunkt = "STATE" GROUP BY aktor, tag) sub GROUP BY sub.aktor ORDER BY monat ASC, dauer DESC',
						Event,
						{raw: true}
				).then(function (events) {
					callback(createChartDataFrom(events, zeitspanne));
				});
			} else if (sumOrAverage == 'sum') {
				/*Event.findAll({
					attributes: ['aktor', zeitspanne, [sequelize.fn('sum', sequelize.col('dauer')), 'dauer']],
					group: ['aktor', zeitspanne],
					where: {datenpunkt: 'STATE'},
					order: [[zeitspanne, 'ASC'], ['dauer', 'DESC']]
				}, { raw: true }).then(function(events) {
					callback(createChartDataFrom(events, zeitspanne));
				});*/
				sequelize.query(
						'SELECT aktor, ' + zeitspanne + ', sum(dauer) AS dauer FROM ccu.event WHERE datenpunkt = "STATE" GROUP BY aktor, ' + zeitspanne + ' ORDER BY ' + zeitspanne + ', dauer DESC',
						Event,
						{raw: true}
				).then(function (events) {
					callback(createChartDataFrom(events, zeitspanne));
				});
			}
		},

		extractDataFromMultiCall: function(requestBody) {
			var data = requestBody.methodCall.params[0].param[0].value[0].array[0].data[0].value[0].struct[0].member[1].value[0].array[0].data[0];
			var dataObject = {};

			dataObject.id = data.value[0];
			dataObject.aktor = data.value[1];
			dataObject.datenpunkt = data.value[2];
			if (data.value[3].boolean != undefined) {
				dataObject.wert = data.value[3].boolean;
			} else if (data.value[3].string != undefined) {
				dataObject.wert = data.value[3].string;
			} else {
				dataObject.wert = 'NOT-SET';
			}

			return dataObject;
		},

		extractDataFromSimpleEvent: function(requestBody) {
			var params = requestBody.methodCall.params[0];
			var dataObject = {};

			dataObject.id = params.param[0].value[0].string;
			dataObject.aktor = params.param[1].value[0].string;
			dataObject.datenpunkt = params.param[2].value[0].string;
			dataObject.wert = params.param[3].value[0].boolean;

			return dataObject;
		},

		handleEvent: function(Event, dataObject, callBack) {
			Event.findOne({ where: {aktor: dataObject.aktor, datenpunkt: dataObject.datenpunkt}, order: 'timestamp DESC'}).then(function(event) {
				if ((event == null) || ((event != null) && (event.wert != dataObject.wert) && (dataObject.wert == '1'))) {
					Event.create({
						aktor: String(dataObject.aktor),
						datenpunkt: String(dataObject.datenpunkt),
						wert: String(dataObject.wert),
						dauer: '0',
						tag: String(moment().format('YYYY-MM-DD')),
						woche: String(moment().format('ww')),
						monat: String(moment().format('YYYY-MM')),
						jahr: String(moment().format('YYYY'))
					}).then(function(event){
						console.log('Event created!');
						callBack('<?xml version="1.0"?><methodResponse><params><param><value>Event stored!</value></param></params></methodResponse>');
					});
				} else if ((event != null) && (event.wert == dataObject.wert)) {
					console.log('Duplicate Event, NOT stored!');
					callBack('<?xml version="1.0"?><methodResponse><params><param><value>Duplicate Event, NOT stored!</value></param></params></methodResponse>');
				} else if (dataObject.wert == '0') {
					Event.findOne({ where: {aktor: dataObject.aktor, datenpunkt: dataObject.datenpunkt, wert: '1'}, order: 'timestamp DESC'}).then(function(event) {
						if (event == null) {
							console.log('No matching ON event found, NOT stored!');
							callBack('<?xml version="1.0"?><methodResponse><params><param><value>No matching ON event found, NOT stored!</value></param></params></methodResponse>');
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
								dauer: String(diff),
								tag: String(moment().format('YYYY-MM-DD')),
								woche: String(moment().format('ww')),
								monat: String(moment().format('YYYY-MM')),
								jahr: String(moment().format('YYYY'))
							}).then(function(event){
								console.log('Event created!');
								callBack('<?xml version="1.0"?><methodResponse><params><param><value>Event stored!</value></param></params></methodResponse>');
							});
						}
					});
				}
			});
		}
};
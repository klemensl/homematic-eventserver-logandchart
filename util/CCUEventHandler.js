module.exports = {
		auswertung: function (sequelize, Event, zeitspanne, callback) {
			Event.findAll({
				attributes: ['aktor', zeitspanne, [sequelize.fn('sum', sequelize.col('dauer')), 'dauer']],
				group: ['aktor', zeitspanne],
				limit: 10
			}, { raw: true }).then(function(events) {
				//console.log(events);
				
				/*var labels = [events[0][zeitspanne]];
				var dataset = {
						label: events[0].aktor,
						fillColor: "rgba(151,187,205,0.2)",
						strokeColor: "rgba(151,187,205,1)",
						pointColor: "rgba(151,187,205,1)",
						pointStrokeColor: "#fff",
						pointHighlightFill: "#fff",
						pointHighlightStroke: "rgba(151,187,205,1)",
						data: [events[0].dauer]
				};

				var data = {
						labels: [labels],
						datasets: [dataset]
				};*/
				
				var labels = [];
				var datasetLabels = [];
				//var datasetData = [];
				for (var i in events) {
					var event = events[i];
					console.log(event);
					
					if (labels.indexOf(event[zeitspanne]) == -1) {
						labels.push(event[zeitspanne]);
					}
					
					if (datasetLabels.indexOf(event.aktor) == -1) {
						datasetLabels.push(event.aktor);
					}
					
					/* "0" er fehlen am Ende vom Dataset, wenn der Aktor an den Tagen nicht Eingesetzt wurde... evtl eh OK
					if (datasetData.indexOf(event.aktor) == -1) {
						datasetData.push(event.aktor);
						datasetData[event.aktor] = {data: []};
						
						for (var j in labels) {
							datasetData[event.aktor].data.push(0);
						}
					}
					
					datasetData[event.aktor].data[labels.indexOf(event[zeitspanne])] = event.dauer;*/
				}

				var datasetData = [];
				for (var i in events) {
					var event = events[i];
					
					if (datasetData.indexOf(event.aktor) == -1) {
						datasetData.push(event.aktor);
						datasetData[event.aktor] = {data: []};
						
						for (var j in labels) {
							datasetData[event.aktor].data.push(0);
						}
					}
					
					datasetData[event.aktor].data[labels.indexOf(event[zeitspanne])] = event.dauer;
				}
				
				var datasets = [];
				for (var i in datasetLabels) {
					datasets.push({
						label: datasetLabels[i],
						data: datasetData[datasetLabels[i]]
					});
				}

				var resultObject = {
						labels: labels,
						datasets: datasets
				};
				callback(resultObject);
			});
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
		}
};
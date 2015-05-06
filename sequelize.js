var Sequelize = require('sequelize');
var sequelize = new Sequelize('mysql://localhost:3306/ccu', 'node', 'node');
var sequelize = new Sequelize('ccu', 'node', 'node', {
	dialect: "mysql", // or 'sqlite', mysql', 'mariadb'
	port:    3306, // or 5432 (for postgres)
});

/*var User = sequelize.define('User', {
  username: Sequelize.STRING,
  birthday: Sequelize.DATE
});

return sequelize.sync().then(function() {
  return User.create({
    username: 'janedoe',
    birthday: new Date(1980, 6, 20)
  });
}).then(function(jane) {
  console.log(jane.get({
    plain: true
  }))
});*/

sequelize.authenticate().then(function(err) {
	if (!!err) {
		console.log('Unable to connect to the database:', err);
	} else {
		console.log('Connection has been established successfully.');
	}
});


var Event = sequelize.import(__dirname + "/models/event");

Event.findAll().then(function(events) {
	console.log("There are " + events.length + " events!");
	events.forEach(function(event) {
		console.log(event.get({
			plain: true
		}));
	});
});


Event.sync(true).then(function () {
	return Event.create({
		aktor: 'NodeJS',
		datenpunkt: 'DBPunkt',
		wert: '1',
		dauer: '123'
	});
});

/*event.count().then(function(count) {
	console.log("There are " + count + " events!");
});*/
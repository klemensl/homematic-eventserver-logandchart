/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
	var moment = require('moment');
	
	return sequelize.define('event', { 
		/*id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			autoIncrement: true
		},*/
		aktor: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		datenpunkt: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		wert: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		timestamp: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
			allowNull: false,
		},
		tag: {
			type: DataTypes.STRING,
			defaultValue: String(moment().format('YYYY-MM-DD')),
			allowNull: false,
		},
		woche: {
			type: DataTypes.STRING,
			defaultValue: String(moment().format('ww')),
			allowNull: false,
		},
		monat: {
			type: DataTypes.STRING,
			defaultValue: String(moment().format('YYYY-MM')),
			allowNull: false,
		},
		jahr: {
			type: DataTypes.STRING,
			defaultValue: String(moment().format('YYYY')),
			allowNull: false,
		},		
		dauer: {
			type: DataTypes.BIGINT,
			allowNull: true,
			defaultValue: '0'
		}
	}, {
		  freezeTableName: true, // Model tableName will be the same as the model name
		  timestamps: false // timestamps will now be true
	});
};

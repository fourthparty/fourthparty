const {Cc, Ci} = require("chrome");
var observerService = require("observer-service");
const data = require("self").data;
var loggingDB = require("logging-db");

exports.run = function() {

	// Set up logging
	//var createCookiesTable = data.load("create_cookies_table.sql");
	//loggingDB.executeSQL(createCookiesTable, false);

	// Instrument cookie changes
	observerService.add("sessionstore-state-read", function(subject, data) {
		console.log([subject, data]);
	});
	
};
const {Cc, Ci} = require("chrome");
var observerService = require("observer-service");
const data = require("self").data;
var loggingDB = require("logging-db");

/**
 * Originally, localStorage and other sotrages were shimmed and logged through 
 * javascript intrumentation. I'm unable to cross into the unsafe window and 
 * affect the global object through defineProperty, so instead will attempt a
 * forced copy of the storage sqlite database into fourthparty database.
 */

exports.run = function() {
	function copyLocalStorage() {
		var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
		file.append('webappsstore.sqlite');

		var storageService = Cc["@mozilla.org/storage/service;1"].getService(Ci.mozIStorageService);
		var storageConn = storageService.openDatabase(file);

		var statement = storageConn.createStatement('select * from webappsstore2');

		while (statement.executeStep()) {
	  	var update = {};

	  	update['scope'] = loggingDB.escapeString(statement.row.scope);
	  	update['key'] = loggingDB.escapeString(statement.row.key);
			update['value'] = loggingDB.escapeString(statement.row.value);
	  	update['secure'] = statement.row.secure;
	  	update['owner'] = loggingDB.escapeString(statement.row.owner);

	  	loggingDB.executeSQL(loggingDB.createInsert("local_storage", update), false);
		}
	}

	// Set up logging
	var createLocalStorageTable = data.load("create_local_storage_table.sql");
	loggingDB.executeSQL(createLocalStorageTable, false);

	// tying to a particular page since applicaiton shutdown events are passed after the databases are no longer available
	observerService.add("content-document-global-created", function(subject, data) {
		var window = subject;
		var location = window.document && window.document.location ? window.document.location : "";

		if (location == 'http://www.josesignanini.com/') {
			copyLocalStorage();
		}
	});
};

const {Cc, Ci} = require("chrome");
var timers = require("jp-timers");//"timers");
var dbConnection = null;
var asyncCallsMade = false;
var asyncQueue = [];
const MAX_ASYNC_QUEUE = 1000;
const ASYNC_INTERVAL_MS = 1000;
const FILE_NAME = "fourthparty.sqlite";
var intervalID;

var processAsyncQueue = function() {
	if(asyncQueue.length > 0) {
		dbConnection.executeAsync(asyncQueue, asyncQueue.length);
		asyncQueue = [];
	}
}

exports.open = function() {
	// Build the path for the SQLite file
	var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
	file.append(FILE_NAME);
	
	// If the file already exists, delete it
	if(file.exists())
		file.remove(true);
	
	// Setup the database connection
	var storageService = Cc["@mozilla.org/storage/service;1"].getService(Ci.mozIStorageService);
	dbConnection = storageService.openDatabase(file);
	
	// Setup async queue timer
	intervalID = timers.setInterval(processAsyncQueue, ASYNC_INTERVAL_MS);
};

exports.close = function() {
	if(dbConnection) {
		if(asyncCallsMade)
			dbConnection.asyncClose();
		else
			dbConnection.close();
	}
	dbConnection = null;
	asyncCallsMade = false;
	timers.clearInterval(intervalID);
};

exports.executeSQL = function(statement, async) {
	try {
		if(!async)
			dbConnection.executeSimpleSQL(statement);
		else {
			asyncCallsMade = true;
			asyncQueue.push(dbConnection.createAsyncStatement(statement));
			if(asyncQueue.length >= MAX_ASYNC_QUEUE)
				processAsyncQueue();
		}
	}
	catch(error) {
		console.log(["Logging error: " + statement, error]);
	}
};

exports.executeSQLWithReturn = function(statement) {
	try {
		statement = dbConnection.createStatement(statement);  
		while (statement.executeStep()) {
			return statement.row.page_id;
		}
	}
	catch(error) {
		console.log(["Logging error: " + statement, error]);
	}
};

exports.escapeString = function(string) {
	// Convert to string if necessary
	if(typeof string != "string")
		string = "" + string;

	// Go character by character doubling 's
	var escapedString = [ ];
	escapedString.push("'");
	for(var i = 0; i < string.length; i++) {
		var currentChar = string.charAt(i);
		if(currentChar == "'")
			escapedString.push("''");
		else
			escapedString.push(currentChar);
	}
	escapedString.push("'");
	return escapedString.join("");
};

exports.boolToInt = function(bool) {
	return bool ? 1 : 0;
};

exports.createInsert = function(table, update) {
	var statement = "INSERT INTO " + table + "(";
	var values = "VALUES (";
	var first = true;
	for(var field in update) {
		statement += (first ? "" : ", ") + field;
		values += (first ? "" : ", ") + update[field];
		first = false;
	}
	statement = statement + ") " + values + ")";
	return statement;
}

exports.createUpdate = function(table, id, update) {
	var statement = "UPDATE " + table + " SET ";
	var first = true;
	for(var field in update) {
		statement += (first ? "" : ", ") + field + '=' + update[field];
		first = false;
	}
	statement = statement + " WHERE id=" + id;
	return statement;
}

exports.createSelect = function (table, id, columns) {
	var statement = "SELECT ";
	var first = true;
	for(var i = 0; i < columns.length; i++) {
		statement += (first ? "" : ", ") + columns[i];
		first = false;
	}
	statement = statement + " FROM " + table + " WHERE id=" + id;
	return statement;
}
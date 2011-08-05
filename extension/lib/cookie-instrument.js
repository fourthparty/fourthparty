const {Cc, Ci} = require("chrome");
var observerService = require("observer-service");
const data = require("self").data;
var loggingDB = require("logging-db");

exports.run = function() {

	// Set up logging
	var createCookiesTable = data.load("create_cookies_table.sql");
	loggingDB.executeSQL(createCookiesTable, false);

	// Instrument cookie changes
	observerService.add("cookie-changed", function(subject, data) {
		// TODO: Support other cookie operations
		if(data == "deleted" || data == "added" || data == "changed") {	
			var update = {};
			update["change"] = loggingDB.escapeString(data);
			
			var cookie = subject.QueryInterface(Ci.nsICookie2);
			update["creationTime"] = cookie.creationTime;
			update["expiry"] = cookie.expiry;
			update["is_http_only"] = loggingDB.boolToInt(cookie.isHttpOnly);
			update["is_session"] = loggingDB.boolToInt(cookie.isSession);
			update["last_accessed"] = cookie.lastAccessed;
			update["raw_host"] = loggingDB.escapeString(cookie.rawHost);
			
			cookie = cookie.QueryInterface(Ci.nsICookie);
			update["expires"] = cookie.expires;
			update["host"] = loggingDB.escapeString(cookie.host);
			update["is_domain"] = loggingDB.boolToInt(cookie.isDomain);
			update["is_secure"] = loggingDB.boolToInt(cookie.isSecure);
			update["name"] = loggingDB.escapeString(cookie.name);
			update["path"] = loggingDB.escapeString(cookie.path);
			update["policy"] = cookie.policy;
			update["status"] = cookie.status;
			update["value"] = loggingDB.escapeString(cookie.value);
			
			loggingDB.executeSQL(loggingDB.createInsert("cookies", update), true);
		}
	});
	
};
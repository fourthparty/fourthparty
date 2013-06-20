const {Cc, Ci} = require("chrome");
const data = require("self").data;
var loggingDB = require("logging-db");
var observerService = require("observer-service");

exports.setup = function() {
	// Set up logging
	var createPagesTable = data.load("create_pages_table.sql");
	loggingDB.executeSQL(createPagesTable, false);
	
	// Log new windows
	observerService.add("content-document-global-created", function(subject, data) {
		var window = subject;
		var pageID = pageIDFromWindow(window);
		var parentID = window.parent ? pageIDFromWindow(window.parent) : -1;
		var location = window.document && window.document.location ? window.document.location : "";

		insertPage(pageID, location, parentID);
	});
};

var insertPage = function(pageID, location, parentID) {
	var update = { };
	update["id"] = pageID;
	update["location"] = loggingDB.escapeString(location);
	update["parent_id"] = parentID;
	loggingDB.executeSQL(loggingDB.createInsert("pages", update), true);
};
exports.insertPage = insertPage;

var pageIDFromWindow = function (window) {
	try {
		return window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils).currentInnerWindowID;
	} catch(error) {
		//console.log(['pageIDFromWindow error', error]);	
	}
	return -1;
};
exports.pageIDFromWindow = pageIDFromWindow;

exports.pageIDFromHttpChannel = function(httpChannel) {
	try {
		var notificationCallbacks = null;
		if(httpChannel.notificationCallbacks)
			notificationCallbacks = httpChannel.notificationCallbacks;
		else if(httpChannel.loadGroup)
			notificationCallbacks = httpChannel.loadGroup.notificationCallbacks;
		if(notificationCallbacks) {
			var loadContext = notificationCallbacks.getInterface(Ci.nsILoadContext)
			var window = loadContext.associatedWindow;
			return pageIDFromWindow(window);
		}
	} catch(error) {
		//console.log("Error getting page ID: " + httpChannel.URI.spec);
	}
	return -1;
};

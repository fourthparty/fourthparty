const {Cc, Ci} = require("chrome");
const data = require("self").data;
var tabsLib = require("sdk/tabs/helpers");
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
	var tab = tabsLib.getTabForWindow(window);
	return tab ? tab.id % 100000 : -1;
};
exports.pageIDFromWindow = pageIDFromWindow;

exports.pageIDFromHttpChannel = function getTabFromChannel(aChannel) {
	try {
		var notificationCallbacks = aChannel.notificationCallbacks ? aChannel.notificationCallbacks : aChannel.loadGroup.notificationCallbacks;
		if (!notificationCallbacks) {
			return -1;
		}

		return tabsLib.getTabForWindow(notificationCallbacks.getInterface(Ci.nsIDOMWindow)).id % 100000;
	} catch (e) {
		return -1;
	}
};

exports.pageIDFromContext = function getTabForContext(context) {
	// If it is the main frame
	if (context._contentWindow instanceof Ci.nsIDOMWindow)
		return SDK.tabsLib.getTabForWindow(context._contentWindow.top);

	if (!(context instanceof Ci.nsIDOMWindow)) {	
		// If this is an element, get the corresponding document
		if (context instanceof Ci.nsIDOMNode && context.ownerDocument)
			context = context.ownerDocument;
		// Now we should have a document, get its window
		if (context instanceof Ci.nsIDOMDocument)
			context = context.defaultView;
		else
			context = null;
	}

	// If we have a window now - get the tab
	if (context) {
		return tabsLib.getTabForWindow(context.top);
	} else {
		return null;
	}
};

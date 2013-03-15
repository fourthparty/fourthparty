const Cc = require('chrome').Cc;
const Ci = require('chrome').Ci;
const Cu = require('chrome').Cu;
const Cm = require('chrome').Cm;
const components = require('chrome').components;

const data = require("self").data;
var xpcom = require('sdk/platform/xpcom');
var xpcomUtils = Cu.import('resource://gre/modules/XPCOMUtils.jsm').XPCOMUtils;
var loggingDB = require("logging-db");
var pageManager = require("page-manager");

exports.run = function() {

	// Set up logging
	var createContentPolicyTable = data.load("create_content_policy_table.sql");
	loggingDB.executeSQL(createContentPolicyTable, false);

	// Instrument content policy API
	// Provides additional information about what caused a request and what it's for
	var InstrumentContentPolicy = {
		QueryInterface: xpcomUtils.generateQI([Ci.nsIContentPolicy]),
		classID: require('sdk/util/uuid').uuid(),
		classDescription: "Instruments the content policy API",
		contractID: "@stanford.edu/instrument-content-policy;1",

		register: function() {
			var registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar),
			  catMan = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager);
				
			registrar.registerFactory(this.classID, this.classDescription, this.contractID, this);
			catMan.addCategoryEntry('content-policy', this.contractID, this.contractID, false, true);

			this.factoryAddonManagement();			
		},

		shouldLoad: function(contentType, contentLocation, requestOrigin, context, mimeTypeGuess, extra) {
			var update = { };
			update["content_type"] = contentType;
			update["content_location"] = loggingDB.escapeString(contentLocation.spec);
			update["request_origin"] = loggingDB.escapeString(requestOrigin ? requestOrigin.spec : "");
			update["page_id"] = -1;

			if(context) {
				var domNode = null;
				var domWindow = null;
				try { domNode = context.QueryInterface(Ci.nsIDOMNode); }
				catch(error) { }
				try { domWindow = context.QueryInterface(Ci.nsIDOMWindow); }
				catch(error) { }
				var window = null;
				if(domNode && domNode.ownerDocument && domNode.ownerDocument.defaultView)
					window = domNode.ownerDocument.defaultView;
					//document = domNode.ownerDocument;
				if(domWindow)
					window = domWindow;
				if(window) {
					update["page_id"] = pageManager.pageIDFromWindow(window);
				}
			}
			update["mime_type_guess"] = loggingDB.escapeString(mimeTypeGuess ? mimeTypeGuess : "");

			loggingDB.executeSQL(loggingDB.createInsert("content_policy", update), true);

			return Ci.nsIContentPolicy.ACCEPT;
		},
		
		// Fires infrequently, instrumentation unused
		shouldProcess: function(contentType, contentLocation, requestOrigin, context, mimeType, extra) {
			return Ci.nsIContentPolicy.ACCEPT;
		},

		// nsIFactory interface implementation
		createInstance: function(outer, iid) {
			if (outer) { throw Cr.NS_ERROR_NO_AGGREGATION; }
			return this.QueryInterface(iid);
		},

		/**
		 * Looks like Addon SDK forgets to remove previous versions content policy.
		 */
		factoryAddonManagement: function () {
			try {
				Cu.import('resource://gre/modules/AddonManager.jsm');
				AddonManager.addAddonListener({
					onUninstalling: function(addon) {
						InstrumentContentPolicy.factoryUnregister(addon);
					},
					onInstalling: function (addon) {
						InstrumentContentPolicy.factoryUnregister(addon);
					}
				});
			} catch (e) {}
		},
	
		factoryUnregister: function (addon) {
			// Checks if factory already exists
			if (addon.id == 'fourthparty@fourthparty.info') {
				try {
					var registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar),
						catMan = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager);
	
					catMan.deleteCategoryEntry('content-policy', InstrumentContentPolicy.contractID, InstrumentContentPolicy.BlockingPolicy);
	
					registrar.unregisterFactory(InstrumentContentPolicy.classID, InstrumentContentPolicy);
				} catch (e) {}
			}
		}
	};

	// XPCOM registration
	InstrumentContentPolicy.register();
};
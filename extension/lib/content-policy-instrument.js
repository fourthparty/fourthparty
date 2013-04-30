const Cc = require('chrome').Cc;
const Ci = require('chrome').Ci;
const Cu = require('chrome').Cu;
const Cm = require('chrome').Cm;
const Cr = require('chrome').Cr;
const components = require('chrome').components;

const data = require("self").data;
var xpcom = require('sdk/platform/xpcom');
var xpcomUtils = Cu.import('resource://gre/modules/XPCOMUtils.jsm').XPCOMUtils;
var loggingDB = require("logging-db");
var pageManager = require("page-manager");

exports.run = function() {

	// Set up logging
	// content policy
	var createContentPolicyTable = data.load("create_content_policy_table.sql");
	loggingDB.executeSQL(createContentPolicyTable, false);
	
	// redirects
	var createRedirectsTable = data.load("create_redirects_table.sql");
	loggingDB.executeSQL(createRedirectsTable, false);

	// Instrument content policy API
	// Provides additional information about what caused a request and what it's for
	var InstrumentContentPolicy = {
		QueryInterface: xpcomUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIChannelEventSink]),
		classID: require('sdk/util/uuid').uuid(),
		classDescription: "Instruments the content policy API",
		contractID: "@stanford.edu/instrument-content-policy;1",

		register: function() {
			var registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar),
			  catMan = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager);
				
			registrar.registerFactory(this.classID, this.classDescription, this.contractID, this);
			catMan.addCategoryEntry('content-policy', this.contractID, this.contractID, false, true);
			catMan.addCategoryEntry('net-channel-event-sinks', this.contractID, this.contractID, false, true);

			this.factoryAddonManagement();
		},

		shouldLoad: function(contentType, contentLocation, requestOrigin, context, mimeTypeGuess, extra) {
			var update = { };
			update["content_type"] = contentType;
			update["content_location"] = loggingDB.escapeString(contentLocation.spec);
			update["request_origin"] = loggingDB.escapeString(requestOrigin ? requestOrigin.spec : "");
			update["page_id"] = -1;

			if (context) {
				var domNode = null;
				var domWindow = null;
				try { domNode = context.QueryInterface(Ci.nsIDOMNode); } catch(error) { }
				try { domWindow = context.QueryInterface(Ci.nsIDOMWindow); } catch(error) { }
				var window = null;
				if (domNode && domNode.ownerDocument && domNode.ownerDocument.defaultView) {
					window = domNode.ownerDocument.defaultView;
					//document = domNode.ownerDocument;
				}

				if (domWindow) {
					window = domWindow;
				}

				if (window) {
					update["page_id"] = pageManager.pageIDFromWindow(window);
				}

				if (update["page_id"] == -1) {
					// using context as a node then
					update["page_id"] = pageManager.pageIDFromWindow(context.defaultView);
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

		getNavInterface: function (channel) {
			var callbacks = [],
				i;

			if (channel.notificationCallbacks) {
				callbacks.push(channel.notificationCallbacks);
			}

			if (channel.loadGroup && channel.loadGroup.notificationCallbacks) {
				callbacks.push(channel.loadGroup.notificationCallbacks);
			}

			for (i = 0; i < callbacks.length; i++) {
				try {
					var win = callbacks[i].getInterface(Ci.nsILoadContext).associatedWindow,
						nav = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation),
						top = callbacks[i].getInterface(Ci.nsILoadContext).topWindow;
					return [win, nav, top];
				} catch(e) {}
			}
		},

		asyncOnChannelRedirect: function (oldChannel, newChannel, flags, callback) {
			InstrumentContentPolicy.onChannelRedirect(oldChannel, newChannel, flags);
			callback.onRedirectVerifyCallback(Cr.NS_OK);
		},

		onChannelRedirect: function (oldChannel, newChannel, flags) {
			var nav = this.getNavInterface(oldChannel);

			var update = { };
			update["from_channel"] = loggingDB.escapeString(oldChannel.originalURI.spec);
			update["to_channel"] = loggingDB.escapeString(newChannel.URI.spec);

			if (nav && nav[0]) {
				update["parent_location"] = loggingDB.escapeString(nav[0].document.location.href);
			}

			if (nav && nav[2]) {
				update["top_location"] = loggingDB.escapeString(nav[2].document.location.href);
			}

			loggingDB.executeSQL(loggingDB.createInsert("redirects", update), true);
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
					catMan.deleteCategoryEntry('net-channel-event-sinks', InstrumentContentPolicy.contractID, InstrumentContentPolicy.BlockingPolicy);
	
					registrar.unregisterFactory(InstrumentContentPolicy.classID, InstrumentContentPolicy);
				} catch (e) {}
			}
		}
	};

	// XPCOM registration
	InstrumentContentPolicy.register();
};
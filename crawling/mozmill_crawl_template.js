/*
A MozMill script for running a web crawl that:
-disables opening new tabs and popups
-disables most modal dialogs
-cycles private browsing with each page load
*/ 

// Point to a local copy of the latest mozmill-test repository
// See https://developer.mozilla.org/en/Mozmill_Tests/Shared_Modules
// On Windows, format path like file://C:/...
var MOZMILL_TEST_ROOT = "";

var PrivateBrowsingAPI = require(MOZMILL_TEST_ROOT + "lib/private-browsing");
var privateBrowsing;

var PrefsAPI = require(MOZMILL_TEST_ROOT + "lib/prefs");
var preferences = PrefsAPI.preferences;
var cspWindowRoot = "capability.policy.default.Window.";
var cspWindowDisableList = ["open", "alert", "confirm", "prompt", "onbeforeunload", "onunload"];
var securityWarningRoot = "security.warn_";
var securityWarningDisableList = ["entering_secure", "entering_weak", "leaving_secure", "submit_insecure", "viewing_mixed"];

var PAGE_LOAD_TIMEOUT = 10000;
var PAGE_WAIT = 10000;
var MAX_SCRIPT_RUN_TIME = 30;

var setupModule = function(module) {
	module.controller = mozmill.getBrowserController();
	
	// Setup private browsing control
	privateBrowsing = new PrivateBrowsingAPI.privateBrowsing(module.controller);
	privateBrowsing.showPrompt = false;
	privateBrowsing.waitForTransitionComplete = privateBrowsing.waitForTransistionComplete;
	module.cyclePrivateBrowsing = function() {
		privateBrowsing.stop();
		privateBrowsing.waitForTransitionComplete(false);
		privateBrowsing.start();
		privateBrowsing.waitForTransitionComplete(true);
	};
	
	// Setup configurable security policies
	for (var i = 0; i < cspWindowDisableList.length; i++)
		preferences.prefBranch.setCharPref(cspWindowRoot + cspWindowDisableList[i], "noAccess");
	// Disable security warnings
	for (var i = 0; i < securityWarningDisableList.length; i++)
		preferences.prefBranch.setBoolPref(securityWarningRoot + securityWarningDisableList[i], false);
	// Bump the maximum script run time to prevent "unresponsive script" errors
	preferences.prefBranch.setIntPref("dom.max_script_run_time", MAX_SCRIPT_RUN_TIME);
}
// BEGIN_REPEAT

var testURL_NUMBER = function(){
	cyclePrivateBrowsing();
	controller.open("URL");
	controller.waitForPageLoad(PAGE_LOAD_TIMEOUT);
	controller.sleep(PAGE_WAIT);
}
// END_REPEAT

var teardownModule = function(module) {
	privateBrowsing.stop();
	for (var i = 0; i < cspWindowDisableList.length; i++)
		preferences.prefBranch.clearUserPref(cspWindowRoot + cspWindowDisableList[i]);
	for (var i = 0; i < securityWarningDisableList.length; i++)
		preferences.prefBranch.clearUserPref(securityWarningRoot + securityWarningDisableList[i]);
	preferences.prefBranch.clearUserPref("dom.max_script_run_time");
}
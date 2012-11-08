// Point to a local copy of the latest mozmill-test repository
// See https://developer.mozilla.org/en/Mozmill_Tests/Shared_Modules
// On Windows, format path like file://C:/...
var MOZMILL_TEST_ROOT = "";

var PrivateBrowsingAPI = require(MOZMILL_TEST_ROOT + "lib/private-browsing");
var privateBrowsing;

var PAGE_WAIT = 15000;

var TABS = 5;
var availableTabs = [ ];
var loadingTime = [ ];

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
		for(var i = 0; i < TABS - 1; i++)
			controller.click(new elementslib.Elem(controller.menus['file-menu']['menu_newNavigatorTab']));
		availableTabs = [ ];
		loadingTime = [ ];
		for(var i = 0; i < TABS; i++) {
			availableTabs.push(i);
			loadingTime.push(-1);
		}
	};
	
	module.clearLoadedTabs = function() {
		for(var i = 0; i < TABS; i++)
			if(loadingTime[i] > 0 && (new Date()).getTime() - loadingTime[i] > PAGE_WAIT) {
				loadingTime[i] = -1;
				availableTabs.push(i);
			}
	};
	
	module.hasFreeTab = function() {
		if(availableTabs.length > 0)
			return true;
		return false;
	};
	
	module.waitForFreeTab = function() {
		controller.waitFor(function() {
			clearLoadedTabs();
			if(hasFreeTab())
				return true;
			return false;
		}, "", 24*60*60*1000, 100, this);
	};
	
	module.waitForAllTabsFree = function() {
		controller.waitFor(function() {
			clearLoadedTabs();
			if(availableTabs.length == TABS)
				return true;
			return false;
		}, "", 24*60*60*1000, 100, this);
	};
	
	cyclePrivateBrowsing();
}
// BEGIN_REPEAT

var testURL_NUMBER = function(){
	var nextPageLocation = "URL";
	if(nextPageLocation == "about:blank") {
		waitForAllTabsFree();
		cyclePrivateBrowsing();
	}

	waitForFreeTab();
	
	var tab = availableTabs[0];
	availableTabs.shift();
	controller.tabs.selectTabIndex(tab);
	loadingTime[tab] = (new Date()).getTime();
	controller.open(nextPageLocation);
}
// END_REPEAT

var teardownModule = function(module) {
	privateBrowsing.stop();
}
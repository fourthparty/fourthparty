// Point to a local copy of the latest mozmill-test repository
// See https://developer.mozilla.org/en/Mozmill_Tests/Shared_Modules
// On Windows, format path like file://C:/...
var MOZMILL_TEST_ROOT = "";

var PrivateBrowsingAPI = require(MOZMILL_TEST_ROOT + "lib/private-browsing");
var privateBrowsing;

var PAGE_WAIT = 15000;
var FOLLOW_PAGES = 5;

var TABS = 5;
var availableTabs = [ ];
var loadingTime = [ ];
var pageCount = [ ];
var nextURLs = [ ];

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
		pageCount = [ ];
		nextURLs = [ ];
		for(var i = 0; i < TABS; i++) {
			availableTabs.push(i);
			loadingTime.push(-1);
			pageCount.push(0);
			nextURLs.push([ ]);
		}
	};
	
	module.clearLoadedTabs = function() {
		for(var i = 0; i < TABS; i++)
			if(loadingTime[i] > 0 && (new Date()).getTime() - loadingTime[i] > PAGE_WAIT) {
				loadingTime[i] = -1;
				
				if(pageCount[i] == 0) {
					var doc = controller.tabs.getTab(i);
					var href = doc.location.href;
					if(href != "about:blank") {
						var elems = doc.getElementsByTagName("a");
						var hostname = doc.location.hostname.toLowerCase();
						var candidateURLSet = { };
						for (var k = 0; k < elems.length; k++)
							try {
								if (elems[k].hostname.toLowerCase() == hostname)
									candidateURLSet[elems[k].href] = true;
							}
							catch(error) {
							}
						var candidateURLList = [ ];
						for(candidateURL in candidateURLSet)
							candidateURLList.push(candidateURL);
						nextURLs[i] = [ ];
						if(candidateURLList.length > 0) {
							candidateURLList = shuffle(candidateURLList);
							for (var j = 0; j < FOLLOW_PAGES; j++)
								nextURLs[i].push(candidateURLList[j]);
						}
					}
				}
				
				pageCount[i] = pageCount[i] + 1;
				
				if(pageCount[i] >= FOLLOW_PAGES || nextURLs[i].length == 0)
					availableTabs.push(i);
				else {
					var nextURL = nextURLs[i][0];
					nextURLs[i].shift();
					controller.tabs.selectTabIndex(i);
					loadingTime[i] = (new Date()).getTime();
					controller.open(nextURL);
				}
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
	
	module.loadNext = function(nextPageLocation) {
		if(nextPageLocation == "about:blank") {
			waitForAllTabsFree();
			cyclePrivateBrowsing();
		}
		waitForFreeTab();
		var tab = availableTabs[0];
		availableTabs.shift();
		controller.tabs.selectTabIndex(tab);
		loadingTime[tab] = (new Date()).getTime();
		pageCount[tab] = 0;
		nextURLs[tab] = [ ];
		controller.open(nextPageLocation);
	}
	
	module.shuffle = function(v){
		for(var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
		return v;
	};
	
	cyclePrivateBrowsing();
}

var testInitial = function(){
	loadNext("about:blank");
}

// BEGIN_REPEAT

var testURL_NUMBER = function(){
	loadNext("URL");
}
// END_REPEAT

var teardownModule = function(module) {
	waitForAllTabsFree();
	privateBrowsing.stop();
}
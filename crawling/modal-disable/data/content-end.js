// Wrap in a function closure to hide variables
(function () {

document.body.setAttribute("onbeforeunload", "");
document.body.setAttribute("onunload", "");

var bodyObserverOptions = {
	childList: false,
	attributes: true,
	characterData: false,
	subtree: false,
	attributeOldValue: false,
	characterDataOldValue: false,
	attributeFilter: ["onbeforeunload", "onunload"]
};
var bodyObserver = new MutationObserver(function(mutations) {
	if(document.body.getAttribute("onbeforeunload") != "")
		document.body.setAttribute("onbeforeunload", "");
	if(document.body.getAttribute("onunload") != "")
		document.body.setAttribute("onunload", "");
});
bodyObserver.observe(document.body, bodyObserverOptions);

})();
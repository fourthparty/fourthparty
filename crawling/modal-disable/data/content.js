// Wrap in a function closure to hide variables
(function () {

// Bypass the Jetpack DOM wrapper
//let(window = unsafeWindow) {

// Header guard workaround for Jetpack multiple script loading bug
if(typeof window.navigator.modalDisabled == "undefined") {
window.navigator.__defineGetter__("modalDisabled", function() { return true; });

//window.alert
window.__defineGetter__("alert", function() { return function () { }; });

//window.confirm
window.__defineGetter__("confirm", function() { return function () { }; });

//window.open
window.__defineGetter__("open", function() { return function () { }; });

//window.prompt
window.__defineGetter__("prompt", function() { return function () { return ""; }; });

//window.onbeforeunload
window.__defineSetter__("onbeforeunload", function() { });

//window.onunload
//window.__defineSetter__("onunload", function() { });

}

//}

})();

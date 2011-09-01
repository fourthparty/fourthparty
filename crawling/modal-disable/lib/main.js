var pageMod = require("page-mod");
const data = require("self").data;

exports.main = function(options, callbacks) {
	pageMod.PageMod({
		include: "*",
		contentScriptWhen: "start",
		contentScriptFile: data.url("content.js")
	});
};
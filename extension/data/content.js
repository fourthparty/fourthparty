// Wrap in a function closure to hide variables
(function () {
	// Bypass the Jetpack DOM wrapper
	let(window = unsafeWindow) {
		// Header guard workaround for Jetpack multiple script loading bug
		if (typeof window.navigator.instrumented == "undefined") {
			Object.defineProperty(window.navigator, "instrumented", {value : true});
			// Debugging
			
			// Default is off, to enable include in your script
			Object.defineProperty(window.navigator, "intrumentation_debugging", {value : true});
			//Object.defineProperty(window.navigator, "intrumentation_debugging", {value : false});
		
			function debugging() { return window.navigator.instrumentation_debugging; }
			
			// Debugging tool - last accessed variable
			var last_accessed = "";
			Object.defineProperty(window.navigator, "last_accessed", {value : last_accessed});
		
			/*
			function log(instrumentedVariableName) {
				try {
					self.postMessage(instrumentedVariableName);
					if (debugging())
						last_accessed = instrumentedVariableName;
				}
				catch(error) {
					console.log("Attempted to log: " + instrumentedVariableName);
				}
			}
			*/
		
			// Instrumentation helpers
		
			// Recursively generates a path for an element
			function getPathToDomElement(element) {
				if (element == document.body)
					return element.tagName;
		
				if (element.parentNode == null)
					return 'NULL/' + element.tagName;
				
			    var siblingIndex = 1;
			    var siblings = element.parentNode.childNodes;
			    for (var i = 0; i < siblings.length; i++) {
			        var sibling = siblings[i];
			        if (sibling == element) {
			        	var path = getPathToDomElement(element.parentNode);
			        	path += '/' + element.tagName + '[' + siblingIndex;
			        	path += ',' + element.id;
			        	path += ',' + element.className;
			        	if (element.tagName == 'A')
			        		path += ',' + element.href;
			        	path += ']';
			        	return path;
			        }
		
			        if (sibling.nodeType == 1 && sibling.tagName == element.tagName)
			            siblingIndex++;
			    }
			}
		
			// Helper for JSONifying objects
			function serializeObject(object) {
				
				// Handle permissions errors
				try {
					if (object == null)
						return "null";
		
					if (typeof object == "function")
						return "FUNCTION";
		
					if (typeof object != "object")
						return object;
		
					var seenObjects = [];
		
					return JSON.stringify(object, function(key, value) {
						if (value == null)
							return "null";
		
						if (typeof value == "function")
							return "FUNCTION";
		
						if (typeof value == "object") {
							
							// Remove wrapping on content objects
							if ("wrappedJSObject" in value) {
								value = value.wrappedJSObject;
							}
							
							// Serialize DOM elements
							if (value instanceof HTMLElement)
								return getPathToDomElement(value);
			
							// Prevent serialization cycles
							if (key == "" || seenObjects.indexOf(value) < 0) {
								seenObjects.push(value);
								return value;
							} else
								return typeof value;
						}
		
						return value;
					});
				}
				catch(error) {
					console.log("SERIALIZATION ERROR: " + error);
					return "SERIALIZATION ERROR: " + error;
				}
			}
			
			function logErrorToConsole(error) {
				console.log("Error name: " + error.name);
				console.log("Error message: " + error.message);
				console.log("Error filename: " + error.fileName);
				console.log("Error line number: " + error.lineNumber);
				console.log("Error stack: " + error.stack);
			}
			
			// Prevent logging of gets arising from logging
			var inLog = false;
			
			// For gets, sets, etc. on a single value
			function logValue(instrumentedVariableName, value, operation) {
				if (inLog)
					return;
			
				inLog = true;
				try {
					console.log(['logValue', instrumentedVariableName, value, operation]);

					self.port.emit("instrumentation", {
						operation: operation,
						symbol: instrumentedVariableName,
						value: serializeObject(value)
					});
				}
				catch(error) {
				/*
					console.log("Unsuccessful value log!");
					console.log("Operation: " + operation);
					console.log("Symbol: " + instrumentedVariableName);
					console.log("String Value: " + value);
					console.log("Serialized Value: " + serializeObject(value));
					logErrorToConsole(error);
				*/
				}
				inLog = false;
			}
			
			// For functions
			function logCall(instrumentedFunctionName, args) {
				if (inLog)
					return;
		
				inLog = true;
				try {
					/*
					console.log("logCall");
					console.log("Function Name: " + instrumentedFunctionName);
					console.log("Args: " + args.length);
					for(var i = 0; i < args.length; i++) {
						var logLine = "Arg " + i + ": ";
						console.log(logLine + typeof args[i]);
						if (typeof args[i] == "string")
							console.log(logLine + args[i]);
						if (typeof args[i] == "object") {
							console.log("" + args[i]);
							console.log("" + args[i].wrappedJSObject);
							console.log(logLine + Object.keys(args[i]));
						}
					}*/
					// Convert special arguments array to a standard array for JSONifying
					var serialArgs = [ ];
					for (var i = 0; i < args.length; i++)
						serialArgs.push(serializeObject(args[i]));

					console.log(['logCall', instrumentedFunctionName, serialArgs]);

					self.port.emit("instrumentation", {
						operation: "call",
						symbol: instrumentedFunctionName,
						args: serialArgs,
						value: ""
					});
				}
				catch(error) {
					console.log("Unsuccessful call log: " + instrumentedFunctionName);
					logErrorToConsole(error);
				}
				inLog = false;
			}
			
			// Disable setting the document location directly
			// Jetpack scripts currently detach when the document is changed in JavaScript
			
			// Rough implementations of Object.getPropertyDescriptor and Object.getPropertyNames
			// See http://wiki.ecmascript.org/doku.php?id=harmony:extended_object_api
			Object.getPropertyDescriptor = function (subject, name) {
				var pd = Object.getOwnPropertyDescriptor(subject, name);
				var proto = Object.getPrototypeOf(subject);
				while (pd === undefined && proto !== null) {
					pd = Object.getOwnPropertyDescriptor(proto, name);
					proto = Object.getPrototypeOf(proto);
				}
				return pd;
			};
			
			Object.getPropertyNames = function (subject, name) {
				var props = Object.getOwnPropertyNames(subject);
				var proto = Object.getPrototypeOf(subject);
				while (proto !== null) {
					props = props.concat(Object.getOwnPropertyNames(proto));
					proto = Object.getPrototypeOf(proto);
				}
				// FIXME: remove duplicate property names from props
				return props;
			};
			
			// Make an anonymous handler function that returns an object
			function makeHandler(object) {
				return function() { return object; };
			}
			
			// Make an instrumented object proxy
			function makeObjectProxy(objectName, object) {
				return Proxy.create({
					getOwnPropertyDescriptor: function(name) {
						return Object.getOwnPropertyDescriptor(object, name);
					},
			
					getPropertyDescriptor: function(name) {
						return Object.getPropertyDescriptor(object, name);
					},
			
					getOwnPropertyNames: function() {
						return Object.getOwnPropertyNames(object);
					},
			
					getPropertyNames: function() {
						return Object.getPropertyNames(object);
					},
			
					defineProperty: function(name, description) {
						Object.defineProperty(object, name, description);
					},
			
					delete: function(name) {
						try {
							return delete object[name];
						}
						catch(error) {
							return null;
						}
					},
			
					fix: function() {
						return undefined;
					},
			
					has: function(name) {
						return name in object;
					},
			
					hasOwn: function(name) {
						return ({}).hasOwnProperty.call(object, name);
					},
					
					get: function(receiver, name) {
						try {
							if (typeof object[name] == "function")
								return makeFunctionProxy(object, objectName + "." + name, object[name]);
							else {
								logValue(objectName + "." + name, object[name], "get");
								return object[name];
							}
						}
						catch(error) {
							return null;
						}
					},
					
					set: function(receiver, name, val) {
						try {
							logValue(objectName + "." + name, val, "set");
							object[name] = val;
							return true;
						}
						catch(error) {
							return false;
						}
					},
					
					enumerate: function() {
						logValue(objectName, null, "enumerate");
						var result = [];
						for(name in object)
							result.push(name);
						return result;
					},
					
					keys: function() {
						logValue(objectName, null, "keys");
						return Object.keys(object);
					}
				});
			}
			
			function prettyPrintParameter(parameter) {
				if (typeof parameter == "string")
					return '"' + parameter + '"';
				else
					return parameter;
			}
			
			// Make an instrumented function proxy
			function makeFunctionProxy(object, functionName, func) {
				return Proxy.createFunction({
					getOwnPropertyDescriptor: function(name) {
						return Object.getOwnPropertyDescriptor(func, name);
					},
			
					getPropertyDescriptor: function(name) {
						return Object.getPropertyDescriptor(func, name);
					},
			
					getOwnPropertyNames: function() {
						return Object.getOwnPropertyNames(func);
					},
			
					getPropertyNames: function() {
						return Object.getPropertyNames(func);
					},
			
					defineProperty: function(name, description) {
						Object.defineProperty(func, name, description);
					},
			
					delete: function(name) {
						try {
							return delete func[name];
						}
						catch(error) {
							return null;
						}
					},
			
					fix: function() {
						return undefined;
					},
			
					has: function(name) {
						return name in func;
					},
			
					hasOwn: function(name) {
						return ({}).hasOwnProperty.call(func, name);
					},
					
					get: function(receiver, name) {
						try {
							return func[name];
						}
						catch(error) {
							return null;
						}
					},
					
					set: function(receiver, name, val) {
						try {
							func[name] = val;
							return true;
						}
						catch(error) {
							return false;
						}
					},
					
					enumerate: function() {
						for(name in func)
							result.push(name);
						return result;
					},
					
					keys: function() {
						return Object.keys(func);
					}
				},
				function() {
					try {
						logCall(functionName, arguments);
						return func.apply(object, arguments);
					}
					catch(error) {
						return null;
					}
				},
				function() {
					return null;
				});
			}
			
			// Make an instrumented object handler
			function makeObjectProxyHandler(objectName, object) {
				return makeHandler(makeObjectProxy(objectName, object));
			}
			
			// Make an instrumented function handler
			function makeFunctionProxyHandler(object, functionName, func) {
				return makeHandler(makeFunctionProxy(object, functionName, func));
			}
			
			// Instrument an object's property, treating the property as an object
			function instrumentObjectPropertyAsObject(object, objectName, property, propertyName) {
				//object.__defineGetter__(propertyName, makeObjectProxyHandler(objectName + "." + propertyName, property));

				object = makeObjectProxy(objectName + "." + propertyName, object);
			}
			
			// Instrumentation
/*
			// Instrument window.navigator.*
			// window.navigator is defined as const, so must instrument variable by variable
			// WORKS
			var navigatorProperties = [ "appCodeName", "appMinorVersion", "appName", "appVersion", "cookieEnabled", "cpuClass", "onLine", "opsProfile", "platform", "product", "systemLanguage", "userAgent", "userLanguage", "userProfile" ];

			var contentStorage = {}; 

			navigatorProperties.forEach(
				function(property) {
					contentStorage["window.navigator." + property] = window.navigator[property];

					Object.defineProperty(window.navigator, property, {
					    configurable: true,
					    get: function() { logValue("window.navigator." + property, contentStorage["window.navigator." + property], "get"); return contentStorage["window.navigator." + property] },
					    set: function(value) { logValue("window.navigator." + property, contentStorage["window.navigator." + property], "set"); contentStorage["window.navigator." + property] = value; } 
					});
				});


			// Instrument window.screen.*
			// WORKS
			instrumentObjectPropertyAsObject(window, "window", window.screen, "screen");
		
			// Instrument each plugin in window.navigator.plugins
			// WORKS
			// TODO: Instrument plugins returned by the item and namedItem methods
			// TODO: Instrument the mime type within each plugin
			// TODO: Separately instrument the mimetypes for lookup by type and index
			for (var i = 0; i < window.navigator.plugins.length; i++) {
				// Instrument name lookup
				if (typeof window.navigator.plugins[i].name == "string" && window.navigator.plugins[i].name != "") {
					//window.navigator.plugins.__defineGetter__(window.navigator.plugins[i].name, makeObjectProxyHandler('window.navigator.plugins["' + window.navigator.plugins[i].name + '"]', window.navigator.plugins[i]));
					window.navigator.plugins[i] = makeObjectProxy('window.navigator.plugins["' + window.navigator.plugins[i].name + '"]', window.navigator.plugins[i]);
				}

				// Instrument index lookup
				//window.navigator.plugins.__defineGetter__(i, makeObjectProxyHandler("window.navigator.plugins[" + i + "]", window.navigator.plugins[i]));
				window.navigator.plugins[i] = makeObjectProxy("window.navigator.plugins[" + i + "]", window.navigator.plugins[i]);
			}
			
			// Instrument window.navigator.plugins.*
			// WORKS
			instrumentObjectPropertyAsObject(window.navigator, "window.navigator", window.navigator.plugins, "plugins");

			// Instrument each mime type in window.navigator.mimeTypes
			// Uses deep copies of each mime type to preserve the path through the enabledPlugin property
			// WORKS
			// TODO: Instrument mime types returned by the item and namedItem methods
			// TODO: Separately instrument enabledPlugin for lookup by type and index
			for(var i = 0; i < window.navigator.mimeTypes.length; i++) {
				// Instrument type lookup
				if (typeof window.navigator.mimeTypes[i].type == "string" && window.navigator.mimeTypes[i].type != "") {
					window.navigator.mimeTypes[i].__defineGetter__("enabledPlugin", makeObjectProxyHandler('window.navigator.mimeTypes["' + window.navigator.mimeTypes[i].type + '"].enabledPlugin', window.navigator.mimeTypes[i].enabledPlugin));
					window.navigator.mimeTypes.__defineGetter__(window.navigator.mimeTypes[i].type, makeObjectProxyHandler('window.navigator.mimeTypes["' + window.navigator.mimeTypes[i].type + '"]', window.navigator.mimeTypes[i]));
				}

				// Instrument index lookup
				window.navigator.mimeTypes.__defineGetter__(i, makeObjectProxyHandler("window.navigator.mimeTypes[" + i + "]", window.navigator.mimeTypes[i]));
			}

			// Instrument window.navigator.mimeTypes.*
			// WORKS
			instrumentObjectPropertyAsObject(window.navigator, "window.navigator", window.navigator.mimeTypes, "mimeTypes");
			
			// Instrument window.navigator.geolocation.* (HTML5 geolocation API)
			// WORKS
			instrumentObjectPropertyAsObject(window.navigator, "window.navigator", window.navigator.geolocation, "geolocation");
			
			// Instrument window.localStorage (HTML5 local storage API)
			// WORKS
			instrumentObjectPropertyAsObject(window, "window", window.localStorage, "localStorage");
			
			// Instrument window.sessionStorage (HTML5 session storage API)
			// WORKS
			instrumentObjectPropertyAsObject(window, "window", window.sessionStorage, "sessionStorage");
			
			// Instrument the HTML5 storage event
			//window.addEventListener("storage", function(event) { log("EVENT: " + event.type); }, false);
			
			// Instrument window.getComputedStyle
			// WORKS
			// TODO: Better represent the element called on
			//window.__defineGetter__("getComputedStyle", makeFunctionProxyHandler(window, "window.getComputedStyle", window.getComputedStyle));
			window.getComputedStyle = makeFunctionProxy(window, "window.getComputedStyle", window.getComputedStyle);
*/
			
			// Instrument window.name
			// WORKS
			var window_name = window.name;
			Object.defineProperty(window, "name", {
				get: function() { logValue("window.name", window_name, "get"); return window_name; },
				set: function(value) { logValue("window.name", value, "set"); window_name = value; } });
		}
	}
})();


var path = require('path');
var q;
try {
	q = global.require('q');
} catch(err) {
	q = require('q');
}
exports.info = {
	'type': 'staticFiles'
};

var resolveLink = function(link) {
	var cwd = path.join(path.dirname(module.filename), '..', 'static');
	var resolvedLink = path.normalize(path.join(cwd, link));
	return resolvedLink;
};
var getDir = function() {
	var cwd = path.join(path.dirname(module.filename), '..', 'static');
	if(process.platform !== 'win32') {
		return cwd + path.sep;
	} else {
		// force path to be a url/unix style path.
		return cwd.split('\\').join('/') + '/';
	}
};

var resolveLinks = function(links) {
	var resolvedLinks = [];
	links.forEach(function(link) {
		resolvedLinks.push(resolveLink(link));
	});
	return resolvedLinks;
};

/**
Created this function w/ the help of:
1. http://www.javascriptkit.com/javatutors/loadjavascriptcss2.shtml
    Aided in generically "how to load a script/css" dynamically...  There were
    issues with loading jquery as it wasn't getting defined right away.
2. http://www.sitepoint.com/dynamically-load-jquery-library-javascript/
    Aided in detectecting when a script is loaded.
**/
var loadjscssfile = function(doc, filename, filetype, documentlocation){
	var location = 'head';
	if(documentlocation) {
		location = documentlocation;
	}
	var defered = q.defer();
	var fileref;
	if (filetype === '.js'){
		//if filename is a external JavaScript file
		fileref=doc.createElement('script');
		fileref.setAttribute('type','text/javascript');

		// Attach onLoad/onReadyStateChange listeners
		if (fileref.readyState) { //IE
			fileref.onreadystatechange = function () {
				if (fileref.readyState == "loaded" || fileref.readyState == "complete") {
					fileref.onreadystatechange = null;
					defered.resolve();
				}
			};
		} else { //Others
			fileref.onload = function () {
				defered.resolve();
			};
		}

		// configure the file's source url
		fileref.setAttribute('src', filename);
	}
	else if (filetype === '.css'){
		//if filename is an external CSS file
		fileref = doc.createElement('link');
		fileref.setAttribute('rel', 'stylesheet');
		fileref.setAttribute('type', 'text/css');
		fileref.setAttribute('href', filename);
		defered.resolve();
	}
	if (typeof(fileref) !== 'undefined') {
		doc.getElementsByTagName(location)[0].appendChild(fileref);
	}
	return defered.promise;
};

var getLoadResouce = function(doc, resourceLink, isLocal, location) {
	var loadResource = function(results) {
		// console.log('Loading...', resourceLink, typeof(jQuery));
		var defered = q.defer();
		var link;
		if(isLocal) {
			link = resourceLink;
		} else {
			link = resolveLink(resourceLink);
		}
		var filetype = path.extname(resourceLink);
		loadjscssfile(doc, link, filetype, location)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	return loadResource;
};
// Asynchronously load a list of resources
var loadResources = function(doc, resources, isLocal, location) {
	var defered = q.defer();
	var loadingOps = [];
	resources.forEach(function(resource) {
		// console.log('Loading...', resource, typeof(jQuery));
		loadingOps.push(getLoadResouce(doc, resource, isLocal));
	});

	if(loadingOps.length > 0) {
		var results = {};
		loadingOps.reduce(function(soFar, f) {
			return soFar.then(f);
		}, q(results))
		.then(function(res) {
			// console.log('Finished loading resources', res);
			defered.resolve(res);
		}, function(err) {
			// console.log('Error loading resources', err);
			defered.reject(err);
		});
	} else {
		defered.resolve();
	}
	return defered.promise;
};

exports.resolveLink = resolveLink;
exports.resolveLinks = resolveLinks;
exports.getDir = getDir;
exports.getLoadResouce = getLoadResouce;
exports.loadResources = loadResources;

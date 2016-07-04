/*!
 * express-adaptive-images
 * Copyright(c) 2016 JP Erasmus
 * MIT Licensed
 */

var url = require('url');
var path = require('path');
var fs = require('fs');
var mobile = require('is-mobile');
var vary = require('vary');
var mkdirp = require('mkdirp');

var getResolution = function(totalWidth, breakpoints) {
  var result = null;
  breakpoints.forEach(function(breakpoint) {
    if (totalWidth <= breakpoint) {
      result = breakpoint;
    }
  });
  return result;
};

function valueInArray(value, array) {
	for (var i = 0, len = array.length; i < len; i++) {
		if (value === array[i]) return true;
	}
	return false;
}

module.exports = function(dirName, options) {
  var opts = Object.create(options || null);
  var imageTypes = opts.imageTypes || [ '.jpg', '.png', '.jpeg', '.gif' ];
  var breakpoints = opts.breakpoints || [ 1382, 992, 768, 480 ];  // the resolution break-points to use (screen widths, in pixels)
  var cachePath = opts.cachePath || 'ai-cache';                   // where to store the generated re-sized images. Specify from your document root!
  var jpgQuality = opts.jpgQuality || 75;                         // the quality of any generated JPGs on a scale of 0 to 100
  var sharpen = opts.sharpen || true;                             // Shrinking images can blur details, perform a sharpen on re-scaled images?
  var watchCache = opts.watchCache || true;                       // check that the adapted image isn't stale (ensures updated source images are re-cached)
  var cachePeriod = opts.cachePeriod || 60 * 60 * 24 * 7;         // How long the BROWSER cache should last (seconds, minutes, hours, days. 7days by default)
  var setExpirationHeaders = opts.setExpirationHeaders || true;   // Whether expires headers need to be set on cached images
  var useImageMagick = opts.useImageMagick || false;              // Whether to use ImageMagick or the default GraphicsMagick
  var compressionType = opts.compression || 'None';               // Choices are: None, BZip, Fax, Group4, JPEG, Lossless, LZW, RLE, Zip, or LZMA
  var debugEnabled = opts.debug || false;                         // Whether debug is enabled or not
  var gm = require('gm').subClass({ imageMagick: useImageMagick });

  var debug = function() {
    if (debugEnabled) {
      console.log('\n');
      console.log([].slice.call(arguments));
    }
  };

  return function(req, res, next) {
		var method = req.method.toUpperCase();

    // If not a proper request or cookies don't exist, no point in continuing
    if ((method !== 'GET' && method !== 'HEAD') || !req.cookies) {
			next();
			return;
		}

    // Get request for image
    var requestedUri = req.originalUrl;
    // if the requested URL starts with a slash, remove the slash
    requestedUri = requestedUri.substr(0, 1) === '/' ? requestedUri.substr(1) : requestedUri;

    if (!valueInArray(path.extname(requestedUri), imageTypes) || !req.headers.accept) {
      debug('"' + path.extname(requestedUri) + '" is not an accepted image type: ', imageTypes.join(', '));
      next();
      return;
    }

    // Check device resolution
    var cookieValue = req.cookies.resolution;
    var cookieData = cookieValue.split(',');
    var clientWidth = parseInt(cookieData[0] || 0, 10); // the base resolution (CSS pixels)
    var totalWidth = clientWidth;
    var pixelDensity = parseInt(cookieData[1], 10) || 1; // the device's pixel density factor (physical pixels per CSS pixel)

    // make sure the supplied break-points are in reverse size order
    breakpoints.sort(function(a, b) {
      return b - a;
    });

    // by default use the largest supported break-point
    var resolution = breakpoints[0];

    // if pixel density is not 1, then we need to be smart about adapting and fitting into the defined breakpoints
    if (pixelDensity !== 1 && totalWidth <= breakpoints[0]) {
      resolution = getResolution(clientWidth * pixelDensity, breakpoints) || resolution;
    } else { // pixel density is 1, just fit it into one of the breakpoints
      resolution = getResolution(totalWidth, breakpoints) || resolution;
    }

    // No "resolution" cookie was set
    if (!clientWidth) {
      // We send the lowest resolution for mobile-first approach, and highest otherwise
      resolution = mobile(req) ? breakpoints[breakpoints.length - 1] : breakpoints[0];
    }
  
    // Update request URL for static middleware to take care of serving it up
    var updateRequestUri = function(cacheFile) {
      debug('Request URL before update: ', req.url);
      req.url = cacheFile.replace(dirName, '');
      vary(res, 'Accept');
      if (setExpirationHeaders) {
        var expires = cachePeriod * 1000;
        res.setHeader("Cache-Control", "public, max-age=" + expires);
        res.setHeader("Expires", new Date(Date.now() + expires).toUTCString());
      }
      debug('Updating Request URI to:', req.url);
      next();
    };

    var createCachedImage = function(originalImage, cacheFile, resolution, requestedUri) {
      gm(originalImage)
        .resize(resolution)
        .noProfile()
        .quality(jpgQuality)
        .compress(compressionType)
        .write(cacheFile, function(error) {
          if (error) {
            debug('Writing of cached image failed.');
            next();
          } else {
            debug('New cached image successfully written.');
            updateRequestUri(cacheFile);
          }
        });
    };

    var imageHasExpired = function(cacheFile) {
      try {
        debug('Checking whether image has expired.');
        var stats = fs.statSync(cacheFile);
        var now = Math.round(Date.now() / 1000);
        var modifiedTime = Math.round(stats.mtime.getTime() / 1000);
        var difference = now - modifiedTime;
        var expired = difference > cachePeriod;
        debug('File expired? ', expired);
        return expired;
      } catch (err) {
        debug('Reading cached image\'s statistics failed.');
        // If error occurred best to be safe and mark file as expired
        return true;
      }
    };

    // Check if image url/<device-width>/image exists and hasn't expired yet
    var cacheFileDirectory = path.resolve(dirName, cachePath, (resolution).toString()) + '/';
    var cacheFile = path.resolve(dirName, cachePath, (resolution).toString(), requestedUri.substr(requestedUri.lastIndexOf('/') + 1));
    var originalPathName = url.parse(req.url).pathname;
    originalPathName = originalPathName.substr(0, 1) === '/' ? originalPathName.substr(1) : originalPathName;
    var originalImage = path.resolve(dirName, originalPathName);

    debug('Cache File Directory:', cacheFileDirectory);
    debug('Cache File:', cacheFile);
    debug('Original Path Name:', originalPathName);
    debug('Original Image:', originalImage);

    // Try and access cached images to obtain the size of the image
    gm(cacheFile)
      .size(function(sizeError) {
        // If it doesn't exist or has expired; recreate correct size image in correct directory
        if (sizeError) {
          debug('Cached image doesn\'t exist, so we have to create it.');
          mkdirp(cacheFileDirectory, function(makeError) {
            if (makeError) {
              debug('Creation of cached directory failed.');
              next();
            } else {
              debug('Cached directory successfully created. Creating cached image next...');
              createCachedImage(originalImage, cacheFile, resolution, requestedUri);
            }
          });
        } else if (watchCache && imageHasExpired(cacheFile)) {
          debug('Image has expired.');
          createCachedImage(originalImage, cacheFile, resolution, requestedUri);
        } else {
          debug('Cached image existed; updating request uri and passing on to static middleware to handle.');
          updateRequestUri(cacheFile);
        }
      });
	};
};
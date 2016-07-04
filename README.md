# Adaptive Images for ExpressJS

## Disclaimer about project
This module is 100% inspired by Matt Wilcox's PHP library, ["Adaptive Images"](http://adaptive-images.com). It is not a one-to-one
mapping in terms of features, but the general idea is the same.


This is a piece of middleware that can be used with [Express](http://expressjs.com/) and [Connect](https://github.com/senchalabs/connect/).

## Installation
`$ npm install express-adaptive-images`

Just like the PHP library you also need to add one line of Javascript to the `<head>` of your page to set a cookie on the
browser/client side with the device's resolution.

```
<script>
  document.cookie='resolution='+Math.max(screen.width,screen.height)+("devicePixelRatio" in window ? ","+devicePixelRatio : ",1")+'; path=/';
</script>
```

### Dependencies
Since a cookie is needed to know the device's resolution, it is required that you use [`cookie-parser`](https://www.npmjs.com/package/cookie-parser)
middleware or any other alternative that would produce an object of cookies on `req.cookies`.

Internally `express-adaptive-images` also uses the `gm` library to resize the images, so you will need to have either
[GraphicsMagick](http://www.graphicsmagick.org/) or [ImageMagick](http://www.imagemagick.org/) installed on your server.
This is pretty easy, so I suggest you take a look [here](https://www.npmjs.com/package/gm#getting-started) for instructions
for your operating system.

By default GraphicsMagick is used by this module, or you can choose to use ImageMagick by setting the `{ useImageMagick: true }` property
as part of the options.

## Usage
```
var adaptiveImages = require('express-adaptive-images');
var cookieParser = require('cookie-parser');
var express = require('express');

var app = express();
var defaultOptions = {
  imageTypes: [ '.jpg', '.png', '.jpeg', '.gif' ],
  breakpoints: [ 1382, 992, 768, 480 ],
  cachePath: 'ai-cache',
  watchCache: true,
  cachePeriod: 60 * 60 * 24 * 7, // 7 days in seconds
  setExpirationHeaders: true,
  useImageMagick: false,
  debug: false
};
var staticPath = __dirname + '/static';

app.use(cookieParser());
app.use(adaptiveImages(staticPath, defaultOptions));
app.use(express.static(staticPath));
```

**Warning**: express-adaptive-images should be used before any middleware that is serving files (e.g. `express.static`)
so that they know to serve the new resized and cached files.

## Overview

The first argument of `express-adaptive-images` (required) is the path to your static assets on the filesystem.
It should generally be the same path that you pass to `express.static`.
The second argument (optional) is an object of options (see the usage example for default values).


## Installation
`$ npm install express-adaptive-images`

## Usage
```
var adaptiveImages = require('express-adaptive-images');
var express = require('express'); 
var app = express();

var staticPath = __dirname + '/static';
var options = { debug: true };
app.use(adaptiveImages(staticPath, options));
app.use(express.static(staticPath));
```

**Warning**: express-adaptive-images should be used before any middleware that is serving files (e.g. `express.static`) so that they know to serve the new resized and cached file.

## Overview
This is a piece of middleware that can be used with [Express](http://expressjs.com/) and [Connect](https://github.com/senchalabs/connect/).

TODO: Flesh out docs

Also upon success, the `Vary` header is set to `Accept` so that caching proxies can distinguish which content to load for the same requested url.

The first argument of express-adaptive-images (required) is the path to your static assets on the filesystem. It should generally be the same path that you pass to `express.static`.
The second argument (optional) is an object of options for express-adaptive-images to act upon.

## License

The MIT License (MIT)

Copyright (c) 2016 JP Erasmus jperasmus11@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

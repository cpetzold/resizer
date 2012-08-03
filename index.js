var connect = require('connect')
  , request = require('request')
  , gm = require('gm')
  , fs = require('fs')
  , qs = require('querystring')
  , path = require('path')
  , util = require('./util')
  , server = connect();

server.use(function(req, res, next) {
  if (req.url == '/favicon.ico') return res.end();
  next();
});

server.use(connect.logger('dev'));

server.use(function(req, res, next) {
  req.query = qs.parse(req._parsedUrl.query);
  next();
});

server.use(function(req, res, next) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
});

var images = {}
  , processing = {};

server.use(function(req, res) {
  var u = req.query.u // URL of the image
    , w = req.query.w || null // Desired width
    , h = req.query.h || null // Desired height
    , c = req.query.c == 'true' // Crop the image to fit
    , sha = util.sha([u, w, h, c].join('.'))
    , src = path.join('images', sha);

  if (!u) {
    res.statusCode = 404;
    return res.end();
  }

  // If we have the image, immediately pipe it to the response
  if (images[sha]) {
    return fs.createReadStream(images[sha]).pipe(res);
  }

  // Request the image and pipe it to gm, resizing
  // Then pipe back out to the response
  var img = gm(request.get(u));

  if (w || h) {
    img.geometry(w, h, '^');
  }

  if (c) {
    img.crop(w, h);
  }

  img.stream(function(e, out, err) {
    out.pipe(res);
  });

  if (!processing[sha]) {
    processing[sha] = true;
    img.write(src, function(e) {
      images[sha] = src;
      delete processing[sha];
    });
  }
});

var port = process.env.NODE_PORT || 3000;
server.listen(port, function(e) {
  console.log('Listening at http://localhost:'+port);
});
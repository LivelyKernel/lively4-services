var childProcess = require('child_process');
var express = require('express');
var fs = require('fs');
var proxy = require('express-http-proxy');
var spawn = childProcess.spawn;

var PORT = 8080;
var LIVELY_SERVER = null;
var LIVELY_SERVER_PORT = 8081;

var app = express();

app.get('/', function(req, res) {
  res.send('' + LIVELY_SERVER.pid);
});

app.get('/lively', function(req, res) {
  res.redirect('/lively/lively4-core/start.html');
});

app.use('/lively', proxy('localhost:' + LIVELY_SERVER_PORT, {
  forwardPath: function(req, res) {
    return require('url').parse(req.url).path;
  }
}));

// CORS middleware
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Request-Method', '*');
  res.header('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

function startLivelyServerInBackground() {
  var livelyServerPath = './node_modules/lively4-server/httpServer.js';
  
  out = fs.openSync('./lively-server.log', 'a');
  err = fs.openSync('./lively-server.log', 'a');

  LIVELY_SERVER = spawn('node', [
    livelyServerPath,
    '--port=' + LIVELY_SERVER_PORT,
    '--directory=services'],
  {
    stdio: [ 'ignore', out, err ]
  });

  console.log('lively-server (#' + LIVELY_SERVER.pid + ') is listenting on ' +
              LIVELY_SERVER_PORT + '...');
}

app.listen(PORT, function () {
  startLivelyServerInBackground();
  console.log('Listening on port ' + PORT + '...');
});
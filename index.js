require('babel-polyfill');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
var express = require('express');
var proxy = require('express-http-proxy');
var spawn = childProcess.spawn;
var ServiceManager = require('./service_manager');
var app = express();
var config = require('./config');
var promisify = require('promisify-node');
var fs = promisify('fs');

process.on('unhandledRejection', function(reason, p){
  console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
});

function startLivelyServerInBackground() {
  var livelyServerPath = './node_modules/lively4-server/httpServer.js';

  if (!fs.existsSync(config.logsDir)){
    fs.mkdirSync(config.logsDir);
  }

  out = fs.openSync('./logs/lively-server.log', 'a');
  err = fs.openSync('./logs/lively-server.log', 'a');

  LIVELY_SERVER = spawn('node', [
      livelyServerPath,
      '--port=' + config.LIVELY_SERVER_PORT,
      '--directory=services'
    ], {
    stdio: [ 'ignore', out, err ]
  });

  console.log('lively-server (#' + LIVELY_SERVER.pid + ') is listenting on ' +
              config.LIVELY_SERVER_PORT + '...');
}

function start(cb) {
  app.get('/', function(req, res) {
    res.json({
      status: 'running'
    });
  });

  app.use('/lively', proxy('localhost:' + config.LIVELY_SERVER_PORT, {
    forwardPath: function(req, res) {
      return require('url').parse(req.url).path;
    }
  }));

  // Parse JSON data in body
  app.use(bodyParser.json());

  // CORS middleware
  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Request-Method', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  app.get('/start', function(req, res) {
    ServiceManager.createScript('testScript', 'setInterval(function() {console.log("test"); }, 1000 );').then(function() {
      ServiceManager.spawnProcess('testScript');
      ServiceManager.startDebugServer();
      res.json({ status: 'success' });
    });
  });
  app.get('/list', function(req, res) {
    var list = ServiceManager.listProcesses();
    return res.json(list);
  });
  app.get('/get', function(req, res) {
    return ServiceManager.getProcessInfo(req.query.serviceName).then(function(info) {
      return res.json(info);
    });
  });

  app.post('/start', function(req, res) {
    var service = req.body;
    ServiceManager.killProcess(service.serviceName);
    ServiceManager.createScript(service.name, service.code).then(function() {
      ServiceManager.spawnProcess(service.name);
      res.json({ status: 'success' });
    });
  });

  app.post('/stop', function(req, res) {
    var service = req.body;
    ServiceManager.killProcess(service.serviceName);
    return res.json({ status: 'success' });
  });

  app.post('/remove', function(req, res) {
    var service = req.body;
    ServiceManager.removeProcess(service.name, function(err) {
      return res.send('removed');
    });
  });

  app.listen(config.PORT, function () {
    startLivelyServerInBackground();
    console.log('Listening on port ' + config.PORT + '...');
    if (cb) {
      cb();
    }
  });
}


if (!module.parent) {
  // the script was directly executed
  start();
}

module.exports = {
  start: start
};

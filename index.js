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
  if (!fs.existsSync(config.logsDir)){
    fs.mkdirSync(config.logsDir);
  }

  out = fs.openSync('./logs/lively-server.log', 'a');
  err = fs.openSync('./logs/lively-server.log', 'a');

  var livelyServerProcess = spawn('node', [
      config.LIVELY_SERVER_PATH,
      '--port=' + config.LIVELY_SERVER_PORT,
      '--directory=services'
    ], {
    stdio: [ 'ignore', out, err ]
  });

  console.log('lively-server (#' + livelyServerProcess.pid + ') is listenting on ' +
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

  app.get('/list', function(req, res) {
    var list = ServiceManager.listProcesses();
    return res.json(list);
  });

  app.post('/get', function(req, res) {
    var service = req.body;
    return ServiceManager.getProcessInfo(service.id).then(function(info) {
      return res.json(info);
    }).catch(function(error) {
      res.json({ status: 'failed', message: error });
    });
  });

  app.post('/start', function(req, res) {
    var service = req.body;
    var promise;
    if (service.id !== undefined && ServiceManager.serviceExists(service.id)) {
      ServiceManager.killProcess(service.id);
      promise = Promise.resolve();
    } else {
      promise = ServiceManager.addService(service.entryPoint).then(function(id) {
        service.id = id;
      });
    }
    promise.then(function() {
      ServiceManager.spawnProcess(service.id);
      res.json({ status: 'success' });
    }).catch(function(error) {
      res.json({ status: 'failed', message: error });
    });
  });

  app.post('/stop', function(req, res) {
    var service = req.body;
    ServiceManager.killProcess(service.id);
    return res.json({ status: 'success' });
  });

  app.post('/remove', function(req, res) {
    var service = req.body;
    ServiceManager.removeProcess(service.id);
    return res.json({ status: 'success'});
  });

  app.listen(config.PORT, function () {
    startLivelyServerInBackground();
    ServiceManager.startDebugServer();
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

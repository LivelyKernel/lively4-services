var childProcess = require('child_process');
var express = require('express');
var fs = require('fs');
var proxy = require('express-http-proxy');
var spawn = childProcess.spawn;
var ServiceManager = require('./service_manager');
var PORT = 9007;
var LIVELY_SERVER = null;
var LIVELY_SERVER_PORT = 8901;
var app = express();

function start(cb) {
  app.get('/', function(req, res) {
    res.send('' + LIVELY_SERVER.pid);
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

  app.get('/start', function(req, res) {
    ServiceManager.createScript('testScript.js', 'setInterval(function() {console.log("test"); }, 1000 );');
    ServiceManager.spawnProcess('testScript.js');
    ServiceManager.startDebugServer();
    return res.send('started');
  });
  app.get('/stop', function(req, res) {
    ServiceManager.shutdownDebugServer();
    return res.send('stopped');
  });
  console.log("app.get(list)");
  app.get('/list', function(req, res) {
    console.log("serve list");
    var response = JSON.parse(JSON.stringify(ServiceManager.listProcesses(), function(k, v) {
      if (k === 'child') {
        return undefined;
      }
      return v;
    }));
    return res.json(response);
  });
  app.get('/get', function(req, res) {
    return res.json(ServiceManager.getProcessInfo(req.query.serviceName));
  });

  app.post('/start', function(req, res) {
    var body = [];
    console.log('post to start');
    req.on('data', function(chunk) {
      body.push(chunk);
    }).on('end', function() {
      body = Buffer.concat(body).toString();
      try {
        var service = JSON.parse(body);
        ServiceManager.createScript(service.name, service.code);
        ServiceManager.spawnProcess(service.name);
        return res.send(service.name + ' started');
      } catch (ex) {
        console.error(ex);
      }
    });
  });
  app.post('/stop', function(req, res) {
    var body = [];
    req.on('data', function(chunk) {
      body.push(chunk);
    }).on('end', function() {
      body = Buffer.concat(body).toString();
      try {
        var service = JSON.parse(body);
        ServiceManager.killProcess(service.serviceName);
        return res.send('killed');
      } catch (ex) {
        console.error(ex);
      }
    });
  });
  app.post('/delete', function(req, res) {
    var body = [];
    req.on('data', function(chunk) {
      body.push(chunk);
    }).on('end', function() {
      body = Buffer.concat(body).toString();
      try {
        var service = JSON.parse(body);
        ServiceManager.removeProcess(service.name);
        return res.send('removed');
      } catch (ex) {
        console.error(ex);
      }
    });
  });

  function startLivelyServerInBackground() {
    var livelyServerPath = './node_modules/lively4-server/httpServer.js';

    var logsDir = './logs';
    if (!fs.existsSync(logsDir)){
      fs.mkdirSync(logsDir);
    }

    out = fs.openSync('./logs/lively-server.log', 'a');
    err = fs.openSync('./logs/lively-server.log', 'a');

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
    if (cb) {
      cb();
    }
  });
};


if (!module.parent) {
  // the script was directly executed
  start();
}

module.exports = {
  start: start
};
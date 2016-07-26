require('babel-polyfill');
var childProcess = require('child_process');
var http = require("http");
var httpProxy = require('http-proxy');
var spawn = childProcess.spawn;
var ServiceManager = require('./service_manager');
var app = http.createServer(dispatch);
var proxy = httpProxy.createProxyServer({ ws: true });
var config = require('./config');
var promisify = require('promisify-node');
var fs = promisify('fs');
var gitClone = require('git-clone');
var portForwardMatcher = /\/port\/([0-9]+)(\/.*)/;

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

function dispatch(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.url.indexOf("/mount/") === 0) {
    req.url = req.url.substr('/mount'.length, req.url.length);
    proxy.web(req, res, {
      target: 'http://localhost:' + config.LIVELY_SERVER_PORT
    });
    return;
  }

  if (req.url.indexOf("/debug/") === 0) {
    req.url = req.url.substr('/debug'.length, req.url.length);
    proxy.web(req, res, {
      target: 'http://localhost:' + config.NODE_INSPECTOR_WEB_PORT
    });
    return;
  }

  var matches = portForwardMatcher.exec(req.url);
  if (matches) {
    var port = matches[1];
    req.url = matches[2];
    proxy.web(req, res, {
      target: 'http://localhost:' + parseInt(port)
    });
    return;
  }

  if (req.method === "GET") {
    if (req.url === "/") {
      return jsonResponse(res, { status: 'running' });
    } else if (req.url === "/list") {
      return jsonResponse(res, ServiceManager.listProcesses());
    } else {
      notFound(res);
    }
  } else if (req.method === "POST") {
    var body = [];
    req.on('data', function(chunk) {
      body.push(chunk);
    }).on('end', function() {
      body = Buffer.concat(body).toString();
      try {
        var data = JSON.parse(body);
        if (req.url === "/get") {
          postGet(req, res, data);
        } else if (req.url === "/start") {
          postStart(req, res, data);
        } else if (req.url === "/clone") {
          postClone(req, res, data);
        } else if (req.url === "/stop") {
          postStop(req, res, data);
        } else if (req.url === "/remove") {
          postRemove(req, res, data);
        } else {
          notFound(res);
        }
      } catch (ex) {
        console.error(ex);
      }
   });
  } else if (req.method === "OPTIONS") {
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    res.writeHead(200);
    res.end();
  } else {
    notFound(res);
  }
}

function postGet(req, res, data) {
  return ServiceManager.getProcessInfo(data.id).then(function(info) {
    return jsonResponse(res, info);
  }).catch(function(error) {
    return jsonResponse(res, { status: 'failed', message: error });
  });
}

function postStart(req, res, data) {
  var promise;
  if (data.id !== undefined && ServiceManager.serviceExists(data.id)) {
    ServiceManager.killProcess(data.id);
    promise = Promise.resolve();
  } else {
    promise = ServiceManager.addService(data.entryPoint).then(function(id) {
      data.id = id;
    });
  }
  promise.then(function() {
    ServiceManager.spawnProcess(data.id);
    jsonResponse(res, { status: 'success', pid: data.id });
  }).catch(function(error) {
    jsonResponse(res, { status: 'failed', message: error });
  });
}
function postClone(req, res, data) {
  var repoUrl = data.url;
  var repoName = repoUrl.split("/").slice(-1)[0].split(".git")[0];
  var dirName = config.servicesDir + "/" + repoName;
  gitClone(repoUrl, dirName, function(error) {
    if (error) {
      jsonResponse(res, { status: 'failed', message: error });
    } else {
      var npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      var npmInstall = spawn(npm, ["install", "--dev"], {cwd : dirName});
      npmInstall.stdout.on('data', function(data) {
        console.log(data.toString());
      });
      npmInstall.stderr.on('data', function(data) {
        console.log(data.toString());
      });
      npmInstall.on('close', function(exitCode) {
        jsonResponse(res, { status: 'success'});
      });
    }
  });
}
function postStop(req, res, data) {
  ServiceManager.killProcess(data.id);
  return jsonResponse(res, { status: 'success' });
}
function postRemove(req, res, data) {
  ServiceManager.removeProcess(data.id);
  return jsonResponse(res, { status: 'success'});
}

function notFound(res) {
  res.writeHead(404);
  res.end();
}

function jsonResponse(res, obj) {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  });
  res.end(JSON.stringify(obj));
}

app.on('upgrade', function (req, socket, head) {
  var matches = portForwardMatcher.exec(req.url);
  if (matches) {
    var port = matches[1];
    req.url = matches[2];
    proxy.ws(req, socket, head, {
      target: 'ws://localhost:' + parseInt(port)
    });
    return;
  }
  proxy.ws(req, socket, head, {
      target: 'ws://localhost:' + config.NODE_INSPECTOR_WEB_PORT
    });
});

function start(cb) {
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

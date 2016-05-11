var childProcess = require('child_process');
var spawn = childProcess.spawn;
var fs = require('fs');
var rimraf = require('rimraf');
var config = require('./config');
var services = {};
var debugServerChild = null;

var ServiceManager = {
  listProcesses: function() {
    return services;
  },
  getProcessInfo: function(serviceName) {
    return {
      service: services[serviceName],
      code: fs.readFileSync(config.servicesDir + serviceName, 'utf8'),
      log: fs.readFileSync(config.logsDir + '/' + serviceName + '/stdout.log', 'utf8')
    };
  },
  createScript: function(serviceName, fileContent, cb) {
    if (!fs.existsSync(config.servicesDir)){
      fs.mkdirSync(config.servicesDir);
    }
    if (!fs.existsSync(config.logsDir)){
      fs.mkdirSync(config.logsDir);
    }

    fs.mkdirSync(config.servicesDir + "/" + serviceName);
    fs.writeFile(config.servicesDir + "/" + serviceName + "/index.js", fileContent, function(err) {
      if (err) {
        return console.error(err);
      }

      if (cb) {
        cb();
      }
    });
  },
  getFilepath: function(serviceName) {
    return config.servicesDir + "/" + serviceName;
  },
  spawnProcess: function(serviceName) {
    console.log("spawn the shell");
    var scriptPath = this.getFilepath(serviceName);
    var logFile = config.logsDir + "/" + serviceName + ".out";
    var child = spawn("node", ["--debug", scriptPath], {
      detached: true
    });

    services[serviceName] = {
      name: serviceName,
      status: 1,
      start: new Date().getTime(),
      kill: -1,
      child: child
    };

    child.stdout.on('data', function (data) {
      fs.appendFile(logFile, data.toString(), function (err) {
        if (err) throw err;
      });
      console.log(child.pid, data.toString());
    });

    child.stderr.on('data', function (data) {
      fs.appendFile(logFile, data.toString(), function (err) {
        if (err) throw err;
      });
      console.log(child.pid, data.toString());
    });

    child.on('close', function(exit_code) {
      var runningService = services[serviceName];
      if (runningService) {
        runningService.status = 0;
        runningService.kill = new Date().getTime();
      }

      console.log('Closed before stop: Closing code: ', exit_code);
    });

    return child.pid;
  },
  killProcess: function(serviceName) {
    var runningService = services[serviceName];
    if (runningService) {
      console.log("kill process");
      runningService.child.kill('SIGKILL');
      runningService.status = 0;
      runningService.kill = new Date().getTime();
    }
  },
  removeProcess: function(serviceName, cb) {
    var runningService = services[serviceName];
    if (runningService) {
      this.killProcess(serviceName);
      delete services[serviceName];
    }
    rimraf(config.servicesDir + "/serviceName", cb);
  },
  startDebugServer: function() {
    if (debugServerChild) {
      console.log("Debug server was already started.");
      return;
    }
    console.log("run inspectorPath");
    var inspectorPath = "./node_modules/node-inspector/bin/inspector.js";
    debugServerChild = spawn(
      'node',
      [inspectorPath, '--web-port', config.NODE_INSPECTOR_WEB_PORT, '--save-live-edit', 'true']
    );
    var child = debugServerChild;
    child.stdout.on('data', function (data) {
      console.log(child.pid, data.toString());
    });

    child.stderr.on('data', function (data) {
      console.log(child.pid, data.toString());
    });

    child.on('close', function(exit_code) {
      console.log('Closed before stop: Closing code: ', exit_code);
    });
  },
  shutdownDebugServer: function() {
    if (debugServerChild) {
      console.log('kill debug server');
      debugServerChild.kill('SIGKILL');
      debugServerChild = null;
    }
  }
};

module.exports = ServiceManager;
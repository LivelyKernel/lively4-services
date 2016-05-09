var childProcess = require('child_process');
var spawn = childProcess.spawn;
var fs = require('fs');
var rimraf = require('rimraf');
var servicesDir = './services';
var logsDir = './logs';

var services = {};
var debugServerChild = null;

var ServiceManager = {
  listProcesses: function() {
    return services;
  },
  getProcessInfo: function(serviceName) {
    return {
      service: services[serviceName],
      code: fs.readFileSync(servicesDir + serviceName, "utf8"),
      log: fs.readFileSync(logsDir + "/" + serviceName + "/stdout.log", "utf8")
    };
  },
  createScript: function(serviceName, fileContent, cb) {
    if (!fs.existsSync(servicesDir)){
      fs.mkdirSync(servicesDir);
    }
    if (!fs.existsSync(logsDir)){
      fs.mkdirSync(logsDir);
    }

    fs.mkdirSync(servicesDir + "/" + serviceName);
    fs.writeFile(servicesDir + "/" + serviceName + "/index.js", fileContent, function(err) {
      if (err) {
        return console.error(err);
      }

      if (cb) {
        cb();
      }
    });
  },
  getFilepath: function(serviceName) {
    return servicesDir + "/" + serviceName;
  },
  spawnProcess: function(serviceName) {
    console.log("spawn the shell");
    var scriptPath = this.getFilepath(serviceName);
    var logFile = logsDir + "/" + serviceName + ".out";
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
  removeProcess: function(serviceName) {
    var runningService = services[serviceName];
    if (runningService) {
      this.killProcess(serviceName);
      delete services[serviceName];
    }
    // TODO make async
    rimraf(servicesDir + "/serviceName", function() {});
  },
  startDebugServer: function() {
    if (debugServerChild) {
      console.log("Debug server was already started.");
      return;
    }
    console.log("run inspectorPath");
    var inspectorPath = "./node_modules/node-inspector/bin/inspector.js";
    debugServerChild = spawn("node", [inspectorPath, "--web-port", "9008", "--save-live-edit", "true"]);
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
      console.log("kill debug server");
      debugServerChild.kill('SIGKILL');
      debugServerChild = null;
    }
  }
};

module.exports = ServiceManager;
var childProcess = require('child_process');
var spawn = childProcess.spawn;
var fs = require('fs');

var scriptsDir = './scripts';

var services = {};
var childProcesses = {};
var debugServerChild = null;

var ServiceManager = {
  listProcesses: function() {
    return services;
  },
  createScript: function(scriptName, fileContent, cb) {
    if (!fs.existsSync(scriptsDir)){
      fs.mkdirSync(scriptsDir);
    }

    fs.writeFile(scriptsDir + "/" + scriptName, fileContent, function(err) {
      if (err) {
        return console.error(err);
      }

      if (cb) {
        cb();
      }
    });
  },
  spawnProcess: function(scriptName) {
    console.log("spawn the shell");
    var scriptPath = scriptsDir + "/" + scriptName;
    var logFile = scriptPath + ".out";
    var child = spawn("node", ["--debug", scriptPath], {
      detached: true
    });

    childProcesses[child.pid] = child;
    services[child.pid] = {
      name: scriptName,
      status: 1,
      start: new Date().getTime(),
      kill: -1
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
      services[child.pid].status = 0;
      services[child.pid].kill = new Date().getTime();
      console.log('Closed before stop: Closing code: ', exit_code);
    });
    
    return child.pid;
  },
  killProcess: function(pid) {
    var child = childProcesses[pid];
    if (child) {
      console.log("kill process");
      child.kill('SIGKILL');
      if (pid in services) {
        services[pid].status = 0;
        services[pid].kill = new Date().getTime();
      }
    }
  },
  startDebugServer: function() {
    if (debugServerChild) {
      console.log("Debug server was already started.");
      return;
    }
    console.log("run inspectorPath");
    var inspectorPath = "./node_modules/node-inspector/bin/inspector.js";
    debugServerChild = spawn("node", [inspectorPath, "--debug-port", "9008"]);
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
var childProcess = require('child_process');
var spawn = childProcess.spawn;
var rimraf = require('rimraf');
var config = require('./config');
var services = {};
var debugServerChild = null;
var promisify = require('promisify-node');
var fs = promisify('fs');
var _ = require('lodash');

var unusedDebugPort = 5000;
var serviceIDs = 0;

function createDir(dir) {
  return fs.mkdir(dir).catch(function(err) {
    if (err && err.code === 'EEXIST') {
      return;
    }
    throw new Error(err);
  });
}

var ServiceManager = {
  serviceExists: function(serviceID) {
    return serviceID in services;
  },
  getServiceWithoutChild: function(service) {
    return _.omit(service, ['child']);
  },
  listProcesses: function() {
    return _.mapValues(services, this.getServiceWithoutChild);
  },
  getProcessInfo: function(serviceID) {
    return Promise.all([
      fs.readFile(config.logsDir + '/' + serviceID + '/stdout.log', 'utf8')
    ]).then(function(codeAndLog) {
      return {
        service: this.getServiceWithoutChild(services[serviceID]),
        log: codeAndLog[0]
      };
    }.bind(this));
  },
  addService: function(entryPoint) {
    var serviceID = serviceIDs++;
    services[serviceID] = {
      id: serviceID,
      status: 0,
      start: -1,
      kill: -1,
      child: null,
      debugPort: null,
      entryPoint: entryPoint
    };
    createDir(config.logsDir).then(function() {
      createDir(config.logsDir + '/' + serviceID);
    });
    return serviceID;
  },
  getFilepath: function(serviceID) {
    return config.servicesDir + '/' + serviceID + '/index.js';
  },
  spawnProcess: function(serviceID) {
    console.log('spawn the shell');

    if (!this.serviceExists(serviceID)) {
      throw new Error('Service #' + serviceID + ' not found.');
    }

    var service = services[serviceID];
    var serviceFile =  config.servicesDir + '/' + service.entryPoint;
    var logFile = config.logsDir + '/' + serviceID + '/stdout.log';
    fs.writeFile(logFile, '');
    var debugPort = unusedDebugPort++;
    var child = spawn('node', ['--debug=' + debugPort, serviceFile]);
    

    service.start = new Date().getTime();
    service.status = 1;
    service.child = child;
    service.debugPort = debugPort;

    services[serviceID] = service;

    child.stdout.on('data', function (data) {
      fs.appendFile(logFile, data.toString());
      console.log(child.pid, data.toString());
    });

    child.stderr.on('data', function (data) {
      fs.appendFile(logFile, data.toString());
      console.log(child.pid, data.toString());
    });

    child.on('close', function(exit_code) {
      var runningService = services[serviceID];
      if (runningService) {
        runningService.status = 0;
        runningService.kill = new Date().getTime();
      }

      console.log('Closed before stop: Closing code: ', exit_code);
    });

    return child.pid;
  },
  killProcess: function(serviceID) {
    var runningService = services[serviceID];
    if (runningService) {
      console.log('kill process');
      runningService.child.kill('SIGKILL');
      runningService.status = 0;
      runningService.kill = new Date().getTime();
    }
  },
  removeProcess: function(serviceID, cb) {
    var runningService = services[serviceID];
    if (runningService) {
      this.killProcess(serviceID);
      delete services[serviceID];
    }
  },
  startDebugServer: function() {
    if (debugServerChild) {
      console.log('Debug server was already started.');
      return;
    }
    console.log('Starting debug server on port ' +
                config.NODE_INSPECTOR_WEB_PORT+ '...');
    var inspectorPath = './node_modules/node-inspector/bin/inspector.js';
    debugServerChild = spawn(
      'node',
      [
        inspectorPath,
        '--web-port', config.NODE_INSPECTOR_WEB_PORT,
        '--save-live-edit', 'true',
      ]
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
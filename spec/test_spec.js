require("babel-polyfill");
var server = require('../index');
var config = require('../config');
var request = require('request');
var promisify = require("promisify-node");
var fs = promisify('fs');
var rimraf = promisify('rimraf');
var route = 'http://localhost:' + config.PORT;

process.on('unhandledRejection', function(reason, p){
  console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
});

describe('Server', function() {
  beforeAll(function(done) {
    Promise.all([rimraf(config.servicesDir), rimraf(config.logsDir)]).then(function() {
      server.start(function() {
        setTimeout(done, 500);  // wait for server to start
      });
    });
  });

  it('gets empty list', function(done) {
    request.get(
      route + '/list',
      function (error, response, body) {
        expect(body).toBe('{}');
        done();
      }
    );
  });

  it('starts test script', function(done) {
    var serviceName = 'test';
    var entryPoint = serviceName + '/index.js';
    var serviceFile = config.servicesDir + '/' + entryPoint;
    fs.mkdir(config.servicesDir).then(function() {
      return fs.mkdir(config.servicesDir + '/' + serviceName);
    }).then(function() {
      return fs.writeFile(serviceFile, 'console.log("start"); setInterval(function() {console.log("test"); }, 1000 );');
    }).then(function() {
      request({
          url: route + '/start',
          method: 'post',
          body: { entryPoint: entryPoint },
          json: true
        },
        function (error, response, body) {
          expect(body).toEqual({ status: 'success' });
          done();
        }
      );
    });
  });

  it('gets non-empty list', function(done) {
    request.get(
      route + '/list',
      function (error, response, body) {
        var json = JSON.parse(body);
        var pids = Object.keys(json);
        expect(pids.length).toBe(1);

        var child = json[pids[0]];
        expect(child.entryPoint).toBe('test/index.js');
        expect(child.status).toBe(1);
        expect(child.kill).toBe(-1);

        done();
      }
    );
  });

  it('gets info of running service', function(done) {
    setTimeout(function() {
      request({
          method: 'post',
          url: route + '/get',
          body: { id: 0 },
          json: true
        },
        function (error, response, json) {
          expect(json.service.entryPoint).toBe('test/index.js');
          expect(json.log).toContain('Debugger listening on port');
          expect(json.log).toContain('start');
          done();
        }
      );
    }, 1000);
  });

  it('connects to the debug server', function(done) {
    request.get(
      'http://localhost:' + config.NODE_INSPECTOR_WEB_PORT,
      function (error, response, body) {
        expect(response.statusCode).toBe(200);
        done();
      }
    );
  });

  it('kills test script', function(done) {
    request({
        url: route + '/stop',
        method: 'post',
        body: { id: 0 },
        json: true
      },
      function (error, response, body) {
        expect(body).toEqual({ status: 'success' });
        done();
      }
    );
  });

  it('removes service', function(done) {
    request({
        url: route + '/remove',
        method: 'post',
        body: { id: 0 },
        json: true
      },
      function (error, response, body) {
        expect(body).toEqual({ status: 'success' });
        done();
      }
    );
  });
});
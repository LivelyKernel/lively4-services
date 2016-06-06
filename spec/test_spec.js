require("babel-polyfill");
var server = require('../index');
var config = require('../config');
var request = require('request');
var promisify = require("promisify-node");
var rimraf = promisify('rimraf');
var route = 'http://localhost:' + config.PORT;

describe('Server', function() {
  beforeAll(function(done) {
    Promise.all([rimraf('./services'), rimraf('./logs')]).then(function() {
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
    request.get(
      route + '/start',
      function (error, response, body) {
        expect(JSON.parse(body)).toEqual({ status: 'success' });
        done();
      }
    );
  });

  it('gets non-empty list', function(done) {
    request.get(
      route + '/list',
      function (error, response, body) {
        var json = JSON.parse(body);
        var pids = Object.keys(json);
        expect(pids.length).toBe(1);

        var child = json[pids[0]];
        expect(child.name).toBe('testScript');
        expect(child.status).toBe(1);
        expect(child.kill).toBe(-1);

        done();
      }
    );
  });

  it('gets info of running service', function(done) {
    request.get(
      route + '/get?serviceName=testScript',
      function (error, response, body) {
        var json = JSON.parse(body);
        expect(json.service.name).toBe('testScript');
        expect(json.code).toBe('setInterval(function() {console.log("test"); }, 1000 );');
        done();
      }
    );
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
        body: {serviceName: 'testScript'},
        json: true
      },
      function (error, response, body) {
        expect(body).toEqual({ status: 'success' });
        done();
      }
    );
  });

  it('creates new service', function(done) {
    var scriptName = 'createdScript';
    request({
        url: route + '/start',
        method: 'post',
        body: { name: scriptName, code: 'console.log("test");' },
        json: true
      },
      function (error, response, body) {
        expect(body).toEqual({ status: 'success' });
        done();
      }
    );
  });

  it('removes service', function(done) {
    var scriptName = 'createdScript';
    request({
        url: route + '/remove',
        method: 'post',
        body: { name: scriptName },
        json: true
      },
      function (error, response, body) {
        expect(body).toEqual({ status: 'success' });
        done();
      }
    );
  });
});
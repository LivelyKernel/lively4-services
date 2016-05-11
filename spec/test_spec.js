require("babel-polyfill");
var server = require('../index');
var request = require('request');
var promisify = require("promisify-node");
var rimraf = promisify('rimraf');

var route = 'http://localhost:9007';

describe('Server', function() {
  beforeAll(function(done) {
    Promise.all([rimraf('./services'), rimraf('./logs')]).then(function() {
      server.start(done);
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
        console.log('body', body)
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
        // expect(json.log).toBe(1);
        done();
      }
    );
  })

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

  it('deletes service', function(done) {
    var scriptName = 'createdScript';
    request({
        url: route + '/delete',
        method: 'post',
        body: { name: scriptName },
        json: true
      },
      function (error, response, body) {
        expect(body).toBe('removed');
        done();
      }
    );
  });
});
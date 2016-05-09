var server = require("../index");
var request = require('request');

var route = 'http://localhost:9007';

describe("Server", function() {
  beforeAll(function(done) {
    server.start(done);
  })

  it("gets empty list", function(done) {
    request.get(
      route + '/list',
      function (error, response, body) {
        expect(body).toBe("{}");
        done();
      }
    );
  });

  it("starts test script", function(done) {
    request.get(
      route + '/start',
      function (error, response, body) {
        expect(body).toBe("started");
        done();
      }
    );
  });

  it("gets empty list", function(done) {
    request.get(
      route + '/list',
      function (error, response, body) {
        var json = JSON.parse(body);
        var pids = Object.keys(json);
        expect(pids.length).toBe(1);

        var child = json[pids[0]];
        expect(child.name).toBe("testScript.js");
        expect(child.status).toBe(1);
        expect(child.kill).toBe(-1);

        done();
      }
    );
  });

  it("starts and kills test script", function(done) {
    function getRunningPid(cb) {
      request.get(
        route + '/list',
        function (error, response, body) {
          var json = JSON.parse(body);
          var pids = Object.keys(json);
          expect(pids.length).toBe(1);

          cb(pids[0]);
        }
      );
    };

    function kill(pid) {
      done();
      request({
          url: route + '/stop',
          method: 'post',
          body: {pid: pid},
          json: true
        },
        function (error, response, body) {
          expect(body).toBe("killed");
          done();
        }
      );
    };

    getRunningPid(kill);
  });

  it("creates new script", function(done) {
    var scriptName = "createdScript.js";
    request({
        url: route + '/start',
        method: 'post',
        body: { name: scriptName, code: "console.log('test');" },
        json: true
      },
      function (error, response, body) {
        expect(body).toBe(scriptName + " started");
        done();
      }
    );
  });
});
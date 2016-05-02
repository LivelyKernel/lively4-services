var http = require("http");
var ServiceManager = require("./service_manager");
var port = 9007;

function jsonResponse(res, obj) {
  res.writeHead(200, {
    'content-type': 'application/json'
  });
  res.end(JSON.stringify(obj));
}

function plainResponse(res, msg) {
  res.writeHead(200, {
    'content-type': 'text/plain'
  });
  res.end(msg);
}

http.createServer(function(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method == "GET") {
    if (req.url === "/start") {
      ServiceManager.createScript("testScript.js", "setInterval(function() {console.log('test'); }, 1000 );");
      ServiceManager.spawnProcess("testScript.js");
      ServiceManager.startDebugServer();
      return plainResponse(res, 'started');
    } else if (req.url === "/stop") {
      ServiceManager.shutdownDebugServer();
      return plainResponse(res, 'stopped');
    } else if (req.url === "/list") {
      return jsonResponse(res, ServiceManager.listProcesses());
    }
  } else if (req.method == "POST") {
    var body = [];
    if (req.url === "/start") {
      req.on('data', function(chunk) {
        body.push(chunk);
      }).on('end', function() {
        body = Buffer.concat(body).toString();
        try {
          var service = JSON.parse(body);
          ServiceManager.createScript(service.name + ".js", service.code);
          ServiceManager.spawnProcess(service.name + ".js");
          return plainResponse(res, service.name + ' started');
        } catch (ex) {
          console.error(ex);
        }
      });
    } else if (req.url === "/stop") {
      req.on('data', function(chunk) {
        body.push(chunk);
      }).on('end', function() {
        body = Buffer.concat(body).toString();
        try {
          var service = JSON.parse(body);
          ServiceManager.killProcess(service.pid);
          return plainResponse(res, service.name + ' killed');
        } catch (ex) {
          console.error(ex);
        }
     });
    }
  }

  return plainResponse(res, 'fail');

}).listen(port, function(err) {
  if (err) {
    throw err;
  }
  console.log("Server running on port " + port);
});
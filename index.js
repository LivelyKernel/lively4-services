var http = require("http");
var ServiceManager = require("./service_manager");
var port = 8000;


http.createServer(function(req, res) {
  ServiceManager.createScript("testScript.js", "setInterval(function() {console.log('test'); }, 1000 );");
  var pid = ServiceManager.spawnProcess("testScript.js");
  ServiceManager.startDebugServer();
  setTimeout(
    ServiceManager.killProcess.bind(ServiceManager, pid),
    5000
  );


  res.writeHead(200, {
    'content-type': 'text/plain'
  });
  res.end('success');
}).listen(port, function(err) {
  if (err) {
    throw err;
  }
  console.log("Server running on port " + port);
});
var http = require('http');

// server : HTTPServer
var server = function() {
  return http.createServer(function(req, res) {
    res.writeHead(200, { "Content-Type": 'text/plain' });
    res.write("Still kickin'");
    res.end();
  });
};

exports.server = server;

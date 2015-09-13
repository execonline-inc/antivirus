var clam      = require('clam-engine');
var R         = require('ramda');
var Promise   = require('bluebird');
var SQS       = require('./lib/sqsp');
var S3        = require('./lib/s3promises');
var SNS       = require('./lib/snsp');
var fops      = require('./lib/fileops');
var clamp     = require('./lib/clamp');
var updater   = require('./lib/updater');
var http      = require('./lib/server');
var timestamp = require('./lib/timestamp');

// log : Object -> Void
var log = function(a) {
  console.log(timestamp() + ": ", a);
};

// error : Object -> Void
var error = function(a) {
  console.error(timestamp() + ": ", a);
};

// For now, if there's an exception, we want to crash and restart, but we
// want to log the error first.
//
// TODO: Handle errors more gracefully, by specifically handling certain,
//       expected error types.
//
// handleErr : Error -> Void
var handleErr = function(err) {
  error(err);
  process.exit(1); // oh noes!
};

// Drop into a Promise chain to see what's there.
// spy : a -> a
var spy = function(something) {
  log(something);
  return something;
};

// loop : Engine -> fn
var loop = function(engine) {
  return function() {
    setImmediate(function() { poll(engine); });
  };
};

// poll : Engine -> Promise Void
var poll = function(engine) {
  return SQS.fetchMessages()
  .map(function(message) {
    return Promise.resolve(R.identity(message))
    .then(SQS.messageContent)
    .then(S3.fetchObject)
    .then(fops.writeFile)
    .then(clamp.scanFile(engine))
    .then(fops.removeFile)
    .then(SNS.sendScanResults)
    .then(SQS.deleteMessage);
  })
  .then(log)
  .then(loop(engine))
  .catch(handleErr);
};

clam.createEngine(function(err, engine) {
  if (err) return console.log('Err!', err);

  poll(engine);
});

// Then every two hours or so, update the virus database again
setInterval(updater.updateVirusDB, 1000 * 60 * 60 * 2);

// Listen for http to satisfy health checks.
http.server().listen(8080);

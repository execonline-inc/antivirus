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

updater.updateVirusDB();

// log : Object -> Void
var log = function(a) {
  console.log(timestamp() + ": ", a);
};

// error : Object -> Void
var error = function(a) {
  console.error(timestamp() + ": ", "Error!", a);
};

// When there's an error, we log the error data and delete
// the SQS message if possible. If the message can't be deleted,
// then this was an unexpected error and we will just crash and
// restart.
//
// TODO: Consider pushing errors out to SNS topics, to be consumed
//       elsewhere.
//
// handleErr : Engine -> Error -> Void
var handleErr = R.curry(function(engine, err) {
  error(err);

  Promise.resolve(R.identity(err))
  .then(loop(engine))
  .catch(exit);
});

// handleSyntaxErr : Message -> Error -> Void
var handleSyntaxErr = R.curry(function(message, err) {
  error(err);
  error("SYNTAX ERROR - deleting message: " + JSON.stringify(message));

  Promise.resolve(R.identity(message))
  .then(SQS.getMessageHandle)
  .then(SQS.deleteMessage);
});


var exit = function() {
  process.exit(1);
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

var fetchFromS3 = R.compose(S3.fetchObject, S3.details);

// poll : Engine -> Promise Void
var poll = function(engine) {
  return SQS.fetchMessages()
  .map(function(message) {
    return Promise.resolve(R.identity(message))
    .then(SQS.messageContent)
    .then(fetchFromS3)
    .then(fops.writeFile)
    .then(clamp.scanFile(engine))
    .then(fops.removeFile)
    .then(SNS.sendScanResults)
    .then(SQS.deleteMessage)
    .catch(handleSyntaxErr(message));
  })
  .then(log)
  .then(loop(engine))
  .catch(handleErr(engine));
};

clam.createEngine(function(err, engine) {
  if (err) return console.log('Err!', err);

  poll(engine);
});

// Then every two hours or so, update the virus database again
setInterval(updater.updateVirusDB, 1000 * 60 * 60 * 2);

// Listen for http to satisfy health checks.
http.server().listen(8080);

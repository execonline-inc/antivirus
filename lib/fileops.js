var Promise = require('bluebird');
var fs      = require('fs');
var R       = require('ramda');
var path    = require('path');
var mkdirp  = require('mkdirp');

// mktree : String -> Promise String
var mktree = function(dir) {
  return new Promise(function(resolve, reject) {
    mkdirp(dir, function(err) {
      if (err) reject(err);
      else     resolve(dir);
    });
  });
};

// saveFile : { bucket: String, key: String, Body: Buffer}
//         -> { *, filename: String }
var saveFile = function(s3Object) {
  return new Promise(function(resolve, reject) {
    fs.writeFile(s3Object.filename, s3Object.Body, function(err) {
      if (err) reject(err);
      else     resolve(s3Object);
    });
  });
};

// writeFile : { bucket: String, key: String, Body: Buffer}
//          -> Promise { *, filename: String }
exports.writeFile = function(s3Object) {
  var file = "files/" + s3Object.bucket + "/" + s3Object.key;

  return mktree(path.dirname(file))
  .then(function() {
    return saveFile(R.merge(s3Object, { filename: file }));
  });
};

// removeFile : { filename: String, * } -> Promise { filename: String, * }
exports.removeFile = function(s3Object) {
  return new Promise(function(resolve, reject) {
    fs.unlink(s3Object.filename, function(err) {
      if (err) reject(err);
      else     resolve(s3Object);
    });
  });
};

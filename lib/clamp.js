var Promise = require('bluebird');
var R       = require('ramda');

// scanFile : Engine
//         -> { filename: String }
//         -> Promise { *, virus: String | null }
exports.scanFile = R.curry(function(engine, fileData) {
  return new Promise(function(resolve, reject) {
    engine.scanFile(fileData.filename, function(err, virus) {
      if (err) reject(err);
      else     resolve(R.merge(fileData, { virus: virus }));
    });
  });
});

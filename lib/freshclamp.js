var spawn = require('child_process').spawn;

// freshclam : Promise Void
var freshclam = function() {
  return new Promise(function(resolve, reject) {
    var proc = spawn("freshclam", [], { stdio: 'inherit' });

    proc.on("error", reject);

    proc.on("exit", function(code) {
      if (code !== 0) {
        reject(new Error("freshclam exited with code " + code));
      }
      else {
        resolve();
      }
    });

  });
};

exports.exec = freshclam;

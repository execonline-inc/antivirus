var freshie = require('./freshclamp');

var completed = function() {
  console.log("Update completed!");
};

var updateVirusDB = function() {
  console.log("Updating virus database");
  freshie.exec().then(completed);
};

exports.updateVirusDB = updateVirusDB;

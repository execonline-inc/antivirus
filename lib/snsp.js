var AWS = require('aws-sdk');
var SNS = new AWS.SNS({
  region:          process.env.AWS_REGION,
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
var R   = require('ramda');

// Configured using ENV var AWS_AV_CLEAN_TOPIC
//
// cleanAvTopicArn : String
var cleanAvTopicArn = process.env.AWS_AV_CLEAN_TOPIC;

// Configured using ENV var AWS_AV_INFECTED_TOPIC
//
// infectedAvTopicArn : String
var infectedAvTopicArn = process.env.AWS_AV_INFECTED_TOPIC;

// topicArn : String | null -> String
var topicArn = function(virus) {
  return virus ? infectedAvTopicArn : cleanAvTopicArn;
};

// results : Object -> { bucket: String, key: String, virus: String | null }
var results = function(scanObj) {
  return {
    bucket: scanObj.bucket,
    key:    scanObj.key,
    virus:  scanObj.virus
  };
};

// virus : { virus: a } -> a
var virus = R.prop("virus");

// formattedResults : Object -> String
var formattedResults = R.compose(JSON.stringify, results);

// sendScanResults : { bucket: String, key: String, virus: String | null }
//                -> Promise { bucket: String, key: String, virus: String | null }
var sendScanResults = function(scanObj) {
  return new Promise(function(resolve, reject) {
    SNS.publish({
      Message:  formattedResults(scanObj),
      TopicArn: topicArn(virus(scanObj))
    }, function(err) {
      if (err) reject(err);
      else     resolve(scanObj);
    });
  });
};

module.exports = {
  sendScanResults: sendScanResults
};

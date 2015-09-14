var AWS = require('aws-sdk');
var S3  = new AWS.S3({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
var Promise = require('bluebird');
var R       = require('ramda');

// decodeUri :: String -> String
var decodeUri = R.compose(decodeURIComponent, R.replace(/\+/g, " "));

// getMessage : { Message: a } -> a | Undefined
var getMessage = R.prop("Message");

// parseMessage : { Message: a } -> Object
var parseMessage = R.compose(JSON.parse, getMessage);

// getRecords : { Records: a } -> [a]
var getRecords = R.prop("Records");

// mapRecords : [{ Records: a }] -> [a]
var mapRecords = R.map(getRecords);

// objectDetail : { s3.bucket.name: String, s3.object.key: String }
//             -> { bucket: String, key: String }
var objectDetail = function(obj) {
  return {
    bucket: obj.s3.bucket.name,
    key:    decodeUri(obj.s3.object.key)
  };
};

// s3ObjectDetails : [{ s3.bucket.name: String, s3.object.key: String }]
//                -> [ { bucket: String, key: String }]
var s3ObjectDetails = R.map(objectDetail);

// processS3Notification : { S3 Notification }
//                      -> { bucket:        String,
//                           key:           String,
//                           receiptHandle: String
//                         }
var processS3Notification = R.compose(
  R.nth(0),  // only expect one s3 file record
  s3ObjectDetails,
  getRecords,
  parseMessage
);

// details : { S3 Notification }
//        -> { bucket: String, key: String, receiptHandle: String}
exports.details = function details(s3notification) {
  return R.merge(
    { receiptHandle: s3notification.receiptHandle },
    processS3Notification(s3notification)
  );
};

// fetchObject : { S3 Details } -> Promise Object
exports.fetchObject = function fetchObject(details) {
  return new Promise(function(resolve, reject) {
    S3.getObject({
      Bucket: details.bucket,
      Key:    details.key
    }, function(err, data) {
      if (err) reject(R.merge(err, details));
      else     resolve(R.merge(data, details));
    });
  });
};

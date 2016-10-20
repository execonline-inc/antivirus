var AWS     = require('aws-sdk');
var Promise = require('bluebird');
var R       = require('ramda');

var SQS = new AWS.SQS({
  region:          process.env.AWS_REGION,
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
 });

// Configured based on the environment (AWS_AV_QUEUE).
// queueUrl : String
var queueUrl = process.env.AWS_AV_QUEUE;

// getMessages : { Messages: a } -> a | []
var getMessages = R.propOr([], "Messages");

// getMessageBody : { Body: a } -> a
var getMessageBody = R.prop("Body");

// parseMessageBody : { Body: a } -> Object
var parseMessageBody = R.compose(JSON.parse, getMessageBody);

// mapMessageBodies : [{ Body: a }] -> [a]
var mapMessageBodies = R.map(getMessageBody);

// getMessageHandle : { ReceiptHandle: String, Body: a }
//               -> Object
var getMessageHandle = function(data) {
  return R.merge(
    data,
    { receiptHandle: data.ReceiptHandle }
  );
};

// messageContent : { ReceiptHandle: String, Body: a }
//               -> Object
var messageContent = function(data) {
  return R.merge(
    parseMessageBody(data),
    { receiptHandle: data.ReceiptHandle }
  );
};

// fetchMessages : Promise Object
var fetchMessages = function fetchMessages() {
  return new Promise(function(resolve, reject) {
    SQS.receiveMessage({
      WaitTimeSeconds:     20,
      QueueUrl:            queueUrl,
      MaxNumberOfMessages: 10
    }, function(err, data) {
      if (err) reject(err);
      else     resolve(getMessages(data));
    });
  });
};

// deleteMessage : { receiptHandle: String } -> Promise { * }
var deleteMessage = function deleteMessage(obj) {
  return new Promise(function(resolve, reject) {
    SQS.deleteMessage({
      QueueUrl: queueUrl,
      ReceiptHandle: obj.receiptHandle
    }, function(err, data) {
      if (err) reject(err);
      else     resolve(obj);
    });
  });
};

module.exports = {
  messageContent: messageContent,
  fetchMessages:  fetchMessages,
  deleteMessage:  deleteMessage,
  getMessageHandle: getMessageHandle
};

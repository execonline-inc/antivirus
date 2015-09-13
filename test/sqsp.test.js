var test = require('tape');
var SQS  = require('../lib/sqsp');

test('content parsing', function(t) {
  t.plan(1);

  var content = { Body: JSON.stringify({ ExampleKey: 42 }),
                  ReceiptHandle: 'HANDLE'
                };

  t.same(SQS.messageContent(content),
         { ExampleKey: 42, receiptHandle: 'HANDLE' });

});

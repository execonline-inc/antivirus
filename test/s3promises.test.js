var test = require('tape');
var S3   = require('../lib/s3promises');

test('normalizing s3 details', function(t) {
  t.plan(1);

  var records = { Records: [
    {
      s3: {
        bucket: { name: 'foo' },
        object: { key: 'bar' }
      }
    }
  ]};

  var content = {
    Message: JSON.stringify(records),
    receiptHandle: 'HANDLE'
  };

  t.same(S3.details(content), {
    bucket: 'foo', key: 'bar', receiptHandle: 'HANDLE'
  });

});

# S3-antivirus (code named: Salve)

[ClamAV](http://www.clamav.net/index.html) for your S3.

S3-antivirus runs a small node process that polls SQS for S3 notifications. It
then fetches the S3 object and scans it, reporting the results on SNS topics.

# getting started (development)

Install the dependencies.

```
# OS X
$> brew update && brew install clamav

# Ubuntu
$> apt-get install libclamav-dev clamav-freshclam

```

Install the virus database

```
$> freshclam
```

Then clone the repo and install the other dependencies.

```
$> git clone https://github.com/execonline-inc/antivirus.git
$> cd antivirus
$> npm install
```

The AWS configuration  uses environment variables. The following
variables will need to be set.

```
AWS_ACCESS_KEY_ID      # AWS access key
AWS_SECRET_ACCESS_KEY  # AWS secret key... shhhh!
AWS_REGION             # AWS region (us-east-1, for example)
AWS_AV_QUEUE           # SQS queue subscribed to S3 notifications (a url)
AWS_AV_CLEAN_TOPIC     # SNS topic arn. For clean file notifications.
AWS_AV_INFECTED_TOPIC  # SNS topic arn. For infected file notifications.
```

Then run the script.

```
$> node index.js
```

# the file on it's journey...

Here's a diagram of how S3-antivirus fits into your infrastructure.

![a diagram](https://raw.githubusercontent.com/execonline-inc/antivirus/master/assets/diagram.jpg)

When S3 adds an object it sends out a notification event. We push these
notifications to an SNS topic. The benefit of SNS is that we can have
many services subscribed to the same topic.

SNS topics offer no guarantees of delivery. They are fire and forget. If the
virus scanner is down when an event arrives, then that S3 object isn't scanned.
This just won't do.

Instead of subscribing to the SNS topic, we create an SQS queue. We
subscribe _the queue_ to the S3 events topic. SQS queues offer message
persistence (up to four days, by default). They also have configurable dead
letter fail over. Our virus scanner long polls the SQS queue. This offers us
increased confidence that we will not miss scanning a file.

When the scanner receives an S3 event from the queue, it downloads the object
from S3 and scans it.

If a scanned file is clean (no virus detected), we push a notification out
on a "clean" SNS topic. If we detect a virus, we push a notification out on
an "infected" SNS topic.

The infected topic and the clean topic don't have to be different topics in
practice. We've  separated them so that it is easier to configure
the virus scanner to suit your needs.

Anything that can subscribe to SNS topics can process infected (or clean!)
files.

# updating virus signatures

Worried about keeping the virus signature database up-to-date? We've got that
covered, too.

Clamav uses a tool called `freshclam` to update the signature database. We
ran that earlier to initialize a virus database for development. S3-antivirus
runs `freshclam` whenever the server launches. It then continues to run it
approximately every two hours. Your virus signatures will never be more then
a couple a hours out of date.

# deployment stories

S3-antivirus is just node, so deploy it anyway you would deploy node
applications.

For convenience, we've included a Dockerfile. Docker images provide a
convenient deployment artifact. You can build and test your environment on
your computer. Then deploy _that exact_ environment. This works on any platform
that supports docker images.

To use the Dockerfile, you first need to
[install Docker](https://docs.docker.com/installation/)

Build the docker image:

```
$> docker build -t salve .
```

You can run the docker build as a container.

```
$> docker run --env-file some/path/to/salve/environment/file salve
```

Note: Running S3-antivirus this way requires an env file. The env-file format
is this:

```
AWS_ACCESS_KEY_ID=<AWS access key>
AWS_SECRET_ACCESS_KEY=<AWS secret key... shhhh!>
AWS_REGION=us-east-1
AWS_AV_QUEUE=https://some-sqs-queue/url
AWS_AV_CLEAN_TOPIC=some-topic-arn
AWS_AV_INFECTED_TOPIC=another-or-possibly-the-same-topic-arn
```

S3-antivirus was first deployed using Elastic Beanstalk. Elastic Beanstalk is
a low management computing environment offered by AWS. We've included a command
to build a package suitable for deploying in this environment.

```
$> npm run package
# generates `deploy.zip`
```

# deployment checklist

- Create SNS topics (first time)
  - S3 events
  - Infected files
  - Clean files
- Create SQS queue and subscribe to S3 events topic (first time)
- Upload `deploy.zip` to Elastic Beanstalk
  - Configure environment variables (first time only)

You configure your environment once. Then deploy updates by uploading an new
`deploy.zip`.

Elastic Beanstalk is already connected to CloudWatch. You can set whatever
alerts are appropriate. ElasticBeanstalk autoscales. Changing the configuration
will support a larger volume of file scans.

# a word about coding paradigms

You'll note two key design decisions in this code:

- The use of a declarative, functional style. We used the excellent Ramda
library.
- All asynchronous code uses Promises.

The functional style allowed us to compose the necessary behaviors
from primitives provided by Ramda. This left us writing little code
ourselves.

Promises allowed us to compose and sequence asynchronous
operations without falling into nested callbacks.

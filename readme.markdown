Note: This product is tentatively named 'Salve'. Anywhere you see 'Salve' in
the documentation, you can read that as 'the virus scanner'.


# Salve
[ClamAV](http://www.clamav.net/index.html) for your S3.

Salve runs a small node process that polls SQS for S3 notifications. It then
fetches the S3 object and scans it, reporting the results on SNS topics.

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

The AWS configuration is handled using environment variables. The following
variables will need to be set.

```
AWS_ACCESS_KEY_ID      # AWS access key
AWS_SECRET_ACCESS_KEY  # AWS secret key... shhhh!
AWS_REGION             # AWS region (us-east-1, for example)
AWS_AV_QUEUE           # SQS queue subscribed to S3 notifications (a url)
AWS_AV_CLEAN_TOPIC     # SNS topic arn. Where clean file notifications are pushed.
AWS_AV_INFECTED_TOPIC  # SNS topic arn. Where infected files notifications are pushed.       
```

Then run the script.

```
$> node index.js
```

# the file on it's journey...

Here's a diagram of how Salve fits into your infrastructure.

![a diagram](https://github.com/execonline-inc/antivirus/blob/master/assets/diagram.jpg)

When an object is created, S3 sends out a notification event. We push these
notifications to an SNS topic. The benefit of SNS is that we can have
multiple services subscribed to the same topic. For example, a lambda that
resizes images; a process that indexes PDF contents for searching; and this
virus scanner can all handle the same S3 event at the same time.

SNS topics offer no guarantees of delivery. They are fire and forget. If the
virus scanner happens to be down when an S3 object event is published, then that
S3 object will not be scanned. This just won't do.

Instead of subscribing directly to the SNS topic, we create an SQS queue, and
subscribe _that_ to the S3 events topic. SQS queues offer message persistence
(up to four days, by default) and have configurable dead letter fail over. Our
virus scanner long polls the SQS queue, instead of subscribing directly to SNS.
This offers us greatly increased confidence that we will not miss scanning a
file.

When the scanner receives an S3 event from the queue, it downloads the object
from S3 and scans it.

If a scanned file is clean (no virus detected), we push a notification out
on a "clean" SNS topic. When a scanned file is infected (a virus was detected),
we push a notification out on an "infected" SNS topic.

The infected topic and the clean topic don't have to be different topics in
practice, but we've logically separated them so that it is easier to configure
the virus scanner to suit your needs.

Anything that can subscribe to SNS topics can be used for further processing of
infected (or clean!) files. For example, an AWS Lambda function could be
triggered to quarantine infected S3 objects, or an http endpoint could be called
that updates the list of infected files in a database.

# deployment stories

Salve is just node, so it can be deployed anyway you would normally deploy
node applications.

For convenience, we've included a Dockerfile. Docker images provide a
convenient deployment artifact. You can build and test your environment
locally, and then deploy _that exact_ environment anywhere docker images
are supported.

To use the Dockerfile, you first need to
[install Docker](https://docs.docker.com/installation/)

Build the docker image:

```
$> docker build -t salve .
```

You can run the docker build locally as a container.

```
$> docker run --env-file some/path/to/salve/environment/file salve
```

Note: If you run Salve locally, your env-file needs to look something like this:

```
AWS_ACCESS_KEY_ID=<AWS access key>
AWS_SECRET_ACCESS_KEY=<AWS secret key... shhhh!>
AWS_REGION=us-east-1
AWS_AV_QUEUE=https://some-sqs-queue/url
AWS_AV_CLEAN_TOPIC=some-topic-arn
AWS_AV_INFECTED_TOPIC=another-or-possibly-the-same-topic-arn
```

Salve was first deployed using Elastic Beanstalk, an autoscaling, low
management computing environment offered by AWS. We've also included a
command to build a package suitable for deploying in this environment.

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

One you have your environment configured, then a new deploy is as simple as
uploading an new `deploy.zip`.

Elastic Beanstalk is already connected to CloudWatch, where you can set whatever
alerts are appropriate. It is also an autoscaling environment, so it is easy
to scale up instances based on your file scanning volume.

# a word about coding paradigms

You'll note two key design decisions in this code:

- The use of a declarative, functional style built on the excellent ramda
  library.
- All asynchronous code is handled by Promises.

We felt that this was an appropriate approach in this case since we are really
just building a data processing pipeline.

The functional style allowed us to elegantly compose the necessary behaviors
from primitives provided by Ramda. This left us writing very little code
ourselves.

Promises allowed us to easily compose and sequence several asynchronous,
operations without falling into deeply nested callbacks.

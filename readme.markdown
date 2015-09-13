# Salve
(ClamAV)[http://www.clamav.net/index.html] for your S3.

Salve runs a small node process that polls SQS for S3 notifications. It then
fetches the S3 object and scans it, reporting the results on SNS topics.

# getting started

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
$> git clone <whatever this repo is called>
$> cd <the repo>
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

# the file on it's jouney...

Here's a diagram of how Salve fits into your infrastructure.

![a diagram](https://raw.github.com/USER_NAME/REPO/master/assets/diagram.jpg)

When an object is created, S3 sends out a notification event. We push these
notifications to SNS topics so we can receive the notifications in multiple
places (for example, we use lambda to format and resize new images).

We subscribe an SQS queue to these topics. SQS is used so that we can get
some level of persistence, in case a file is added while Salve is down.

Salve polls for notifications. When it receives one, it downloads the file
and scans it.

When a scanned file is clean (no virus detected), we push a notification out
on a "clean" SNS topic.

When a scanned file is infected (a virus was detected), we push a notficiation
out on an "infected" SNS topic.

The infected topic and the clean topic can be configured to be the same topic,
depending on your needs.

Anything that can subscribe to SNS topics can be used for further processing of
infected (or clean!) files. For example, an AWS Lambda function could be
triggered to quarantine infected S3 objects.

# deployment stories

Salve is just node, so it can be deployed anyway you would normally deploy
node applications, but for convenience, we've included a Dockerfile. To use
the Dockerfile, you first need to (install Docker)[https://docs.docker.com/installation/]

Build the docker image:

```
$> docker build -t salve .
```

You can run the docker build locally as a container.

```
$> docker run --env-file some/path/to/salve/environment/file salve
```

If you're satisfied with how the Salve runs locally, then the docker image
can be deployed in any environment that supports docker. For example, this
docker image should be deployable to AWS Elastic Beanstalk.

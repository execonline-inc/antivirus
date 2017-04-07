FROM node:6.10

RUN apt-get update
RUN apt-get update --fix-missing
RUN apt-get install -y build-essential
RUN apt-get install -y libclamav-dev
RUN apt-get install -y clamav-freshclam
RUN freshclam

RUN apt-get install -y python2.7

RUN ln -s /usr/bin/nodejs /usr/bin/node

COPY *.js src/
COPY *.json src/
COPY files/ src/files
COPY lib/ src/lib
COPY test/ src/test

WORKDIR src/

RUN npm install

EXPOSE 8080

CMD ["node", "index.js"]

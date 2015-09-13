FROM kofno/node-clamdev:x12 

COPY *.js src/
COPY *.json src/
COPY files/ src/files
COPY lib/ src/lib

WORKDIR src/

RUN npm install

EXPOSE 8080

CMD ["node", "index.js"]

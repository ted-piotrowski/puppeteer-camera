# Puppeteer Camera

### How it works

- Docker container starts an Express webserver
- An HTTP `/start` request launches a headless Chromium browser with screen capture Chrome extension installed
- The Chrome extension records the screen and audio output of any page
- Data is streamed directly to S3 bucket in `.webm` format

### Run 

Add .env

```
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
AWS_PUPPETCAM_BUCKET_NAME=bucket-name
```

```sh
docker-compose up --build
docker-compose down -v
```

### Start recording a url

```sh
curl -X POST -H "Content-Type: application/json" -d '{"id":"abc123","url":"https://www.animaker.com"}' localhost:3333/start
```

**Note:** Reusing id will overwrite previous file

### Stop recording a url

```sh
curl -X POST -H "Content-Type: application/json" -d '{"id":"abc123"}' localhost:3333/stop
```

### Record Twilio Video

```sh
curl -X POST -H "Content-Type: application/json" -d '{"id":"abc123","url":"http://localhost:3333/?roomName=XXX&twilioToken=XXX"}' localhost:3333/start
```

See: [index.tsx](https://github.com/ted-piotrowski/puppeteer-camera/blob/main/src/public/index.tsx)


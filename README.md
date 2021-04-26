# Puppetcam

### How it works

Docker container run an Express webserver. An HTTP /start request open up a headless Chromium browser with chrome extension installed.
The chrome extension records the screen and audio output of any page Chromium navigates to and streams the recording data to an S3 bucket.

### Run 

`.env` file available in 1Password. It should contain the following:

```
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
AWS_PUPPETCAM_BUCKET_NAME=hopps-private
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

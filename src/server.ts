import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as path from 'path';
import * as puppeteer from 'puppeteer-core';
// Set up virtual frame buffer, aka render screen pixels to memory instead of an actual display
// Pixel rendering will be saved from memory to webm video recording
import * as Xvfb from 'xvfb';

interface StartRecordingData {
  id: string;
  url: string;
  roomName: string;
  options: puppeteer.LaunchOptions;
}

interface TwilioRecording {
  id: string;
  roomName: string;
  page?: puppeteer.Page;
  browser?: puppeteer.Browser;
}

let currentRecordings: TwilioRecording[] = [];

const xvfb = new (Xvfb as any)({ silent: true });
xvfb.startSync()

process.on('exit', xvfb.stopSync);

const app = express()
const port = 3333
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))

app.post('/start', async (req, res) => {
  const { id, roomName, twilioToken } = req.body;
  console.log(`Incoming request to record Twilio room: ${roomName}`);

  if (id && roomName && twilioToken) {
    const width = req.body.width || 1920;
    const height = req.body.height || 1080;
    const recordingUrl = new URL('http://localhost:3333');
    recordingUrl.searchParams.append('roomName', roomName);
    recordingUrl.searchParams.append('twilioToken', twilioToken);

    const options = {
      headless: false,
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--enable-usermedia-screen-capturing',
        '--allow-http-screen-capture',
        '--auto-select-desktop-capture-source=puppetcam',
        '--load-extension=' + path.join(__dirname, 'chrome_extension'),
        '--disable-extensions-except=' + path.join(__dirname, 'chrome_extension'),
        '--disable-infobars',
        `--window-size=${width},${height}`,
      ],
    };

    await startRecording({ url: recordingUrl.toString(), id, roomName, options })
    res.json({ id });
  } else {
    res.status(422)
    res.json({ error: 'Invalid input' });
  }
});

app.post('/stop', async (req, res) => {
  const { id } = req.body;
  console.log(`Incoming request to stop recording with id: ${id}`);
  console.log(`Current recording ids: ${currentRecordings.map((rec) => rec.id)}`);
  const recording = currentRecordings.find((rec) => rec.id === id);
  if (recording) {
    await stopRecording(recording)
    currentRecordings = currentRecordings.filter((rec) => rec.id !== id);
    res.json({ id });
  } else {
    console.log(`Recording not found for id: ${id}`);
    res.status(422)
    res.json({ error: 'Recording not found' });
  }
})

app.listen(port, () => console.log(`Puppetcam listening on http://localhost:${port}`))

async function startRecording(data: StartRecordingData) {
  const { id, url, roomName, options } = data;
  const browser = await puppeteer.launch(options)
  const pages = await browser.pages()
  const page = pages[0]
  console.log(`Browser spawned and navigating to recording url`)
  await (page as any)._client.send('Emulation.clearDeviceMetricsOverride')
  await page.goto(url, { waitUntil: 'networkidle2' })
  await page.evaluate(() => {
    document.title = 'puppetcam';
  })
  // await page.setBypassCSP(true)
  const backgroundPage = await getBackgroundPage(browser);
  registerLogging(backgroundPage);
  console.log(`Attached logging to background page`)

  await backgroundPage.evaluate(async (config) => {
    await (window as any).PUPPETCAM.setup(config);
  }, {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_PUPPETCAM_BUCKET_NAME,
    key: id,
  });

  console.log('Ran setup() in background page');
  console.log(`Browser extension loaded, begin recording Twilio room: ${roomName}`)

  await backgroundPage.evaluate(async () => {
    await (window as any).PUPPETCAM.start()
  });
  console.log('Ran start() in background page');

  currentRecordings.push({ id, roomName, page: backgroundPage, browser })
}

async function stopRecording(data: TwilioRecording) {
  const { id, roomName, page, browser } = data;
  console.log(`Stopping recording for Twilio room: ${roomName}`);

  const location = await page.evaluate(async () => {
    return await (window as any).PUPPETCAM.stop()
  });
  console.log('Ran stop() in background page');

  // Wait for download of webm to complete
  console.log(`Recording uploaded to S3 for Twilio room: ${id}`);
  console.log(`S3 download url: ${location}`);
  console.log(`Recording logs located at /root/Downloads/${id}.txt for Twilio room: ${roomName}`);
  await browser.close()
}

async function getBackgroundPage(browser: puppeteer.Browser) {
  var targets = await browser.targets();
  const target = await new Promise(resolve => {
    const target = targets.find(target => target.type() === 'background_page' && target.url().endsWith('_generated_background_page.html'));
    if (target)
      return resolve(target);
    const listener = target => {
      if (target.type() === 'background_page' && target.url().endsWith('_generated_background_page.html')) {
        browser.removeListener('targetcreated', listener);
        browser.removeListener('targetchanged', listener);
        resolve(target);
      }
    };
    browser.on('targetcreated', listener);
    browser.on('targetchanged', listener);
  });
  return (target as any).page();
}

function registerLogging(backgroundPage: puppeteer.Page) {
  backgroundPage
    .on('console', message =>
      console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('response', response =>
      console.log(`${response.status()} ${response.url()}`))
    .on('requestfailed', request =>
      console.log(`${request.failure().errorText} ${request.url()}`))
  console.log('Attached logger to extension background page');
  return backgroundPage;
}

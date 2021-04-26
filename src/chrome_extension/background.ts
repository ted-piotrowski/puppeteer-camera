import * as AWS from 'aws-sdk';
import { S3Streamer } from './S3StreamerInput';

interface PuppetcamConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  key: string;
}

class Puppetcam {
  private videoStreamer: S3Streamer;
  private audioStreamer: S3Streamer;

  async setup(config: PuppetcamConfig) {
    const { accessKeyId, secretAccessKey, region, bucket, key } = config;
    console.log('configuring AWS')
    AWS.config.update({
      region,
      accessKeyId,
      secretAccessKey,
    });

    console.log('running setup')
    const streamId = await new Promise((res, rej) => {
      chrome.desktopCapture.chooseDesktopMedia(['tab', 'audio'], res);
    });
    console.log(`Got desktop streamId`, streamId)

    // Get the stream
    const stream: MediaStream = await new Promise((res, rej) => {

      (navigator as any).webkitGetUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
            minWidth: 1920,
            maxWidth: 1920,
            minHeight: 1080,
            maxHeight: 1080,
            maxFrameRate: 30,
          }
        }
      }, res, rej);
    });
    console.log(`Got handle for media stream`)

    const videoRecorder = new MediaRecorder(stream, {
      videoBitsPerSecond: 2500000,
      ignoreMutedMedia: true,
      mimeType: 'video/webm;codecs=vp9'
    } as MediaRecorderOptions);
    this.videoStreamer = new S3Streamer({ recorder: videoRecorder, bucket, key: `${key}.webm` })

    console.log(`Initialized video streamer`)

    // try {
    //   // remove video tracks from stream
    //   const audioStream = stream.clone();
    //   audioStream.getTracks().map(track => {
    //     track.kind === 'video' && audioStream.removeTrack(track)
    //   });
    //   let audioRecorder = new MediaRecorder(stream, {
    //     audioBitsPerSecond: 128000,
    //     mimeType: 'audio/mpeg'
    //   } as MediaRecorderOptions);
    //   this.audioStreamer = new S3Streamer({ recorder: audioRecorder, bucket, key: `${key}.mp3` })
    // } catch (e) {
    //   // could not record audio stream
    // }
  }

  async start() {
    console.log('running start')
    const promises = [];
    if (this.videoStreamer) {
      promises.push(this.videoStreamer.start());
    }
    if (this.audioStreamer) {
      promises.push(this.audioStreamer.start());
    }
    return Promise.all(promises)
  }

  async stop() {
    console.log('running stop')
    const promises = [];
    if (this.videoStreamer) {
      promises.push(this.videoStreamer.stop());
    }
    if (this.audioStreamer) {
      promises.push(this.audioStreamer.stop());
    }
    return Promise.all(promises);
  }
}

(window as any).PUPPETCAM = new Puppetcam();
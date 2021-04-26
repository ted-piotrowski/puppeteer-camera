import * as AWS from 'aws-sdk';

export interface S3StreamerInput {
    recorder: MediaRecorder;
    bucket: string;
    key?: string;
}

export class S3Streamer {
    private recorder: MediaRecorder;
    private bucket: string;
    private key: string;
    private s3: AWS.S3;
    private uploadId: string;
    private uploadParts: Promise<AWS.S3.UploadPartOutput>[];

    constructor(input: S3StreamerInput) {
        const { recorder, bucket, key } = input;

        this.recorder = recorder;
        this.bucket = bucket;
        this.key = key;
        this.uploadParts = [];
        this.s3 = new AWS.S3();

        recorder.ondataavailable = async (event) => {
            console.log('data available', this.key)
            try {
                if (event.data.size > 0) {
                    this.uploadParts.push(this.s3.uploadPart({
                        Body: event.data,
                        Bucket: bucket,
                        Key: this.key,
                        PartNumber: this.uploadParts.length + 1,
                        UploadId: this.uploadId,
                        ContentLength: event.data.size
                    }).promise());
                }
            } catch (e) {
                console.log('ondataavailable error', e)
                if (this.uploadId) {
                    await this.s3.abortMultipartUpload({
                        Bucket: bucket,
                        UploadId: this.uploadId,
                        Key: this.key
                    }).promise();
                }
            }
        };
    }

    async start() {
        return new Promise((res, rej) => {
            this.recorder.onstart = async () => {
                console.log('onstart', this.key)
                const data = await this.s3.createMultipartUpload({
                    Bucket: this.bucket,
                    Key: this.key,
                }).promise();
                this.uploadId = data.UploadId;
                res();
            }
            this.recorder.start();

        })
    }

    async stop() {
        return new Promise<string>((res, rej) => {
            this.recorder.onstop = async () => {
                console.log('onstop', this.key, this.uploadParts.length)
                try {
                    const s3Parts = await Promise.all(this.uploadParts);
                    const { Location } = await this.s3.completeMultipartUpload({
                        Bucket: this.bucket,
                        Key: this.key,
                        UploadId: this.uploadId,
                        MultipartUpload: {
                            Parts: s3Parts.map((resp, index) => { return { ETag: resp.ETag, PartNumber: index + 1 } })
                        }
                    }).promise();
                    return res(Location);
                } catch (e) {
                    console.log('onstop error', e)
                    if (this.uploadId) {
                        await this.s3.abortMultipartUpload({
                            Bucket: this.bucket,
                            Key: this.key,
                            UploadId: this.uploadId,
                        }).promise();
                    }
                    return rej(e);
                }
            }
            this.recorder.stop();
        });
    }
}

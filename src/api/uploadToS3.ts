// upload.ts
import * as path from 'path';
import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const aws_config = {
  bucketName: process.env.S3_BUCKET_NAME,
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
};

// Upload PDF to S3 and send the S3 path to the ingest function
export async function uploadPdfToS3(url: string, courseName: string) {
  // Sanitize filename
  const humanURI = decodeURI(path.basename(url));
  const extension = path.extname(humanURI);
  const nameWithoutExtension = path.basename(humanURI, extension);
  const filename = nameWithoutExtension.replace(/[^a-zA-Z0-9]/g, '-') + extension;

  console.log(`Uploading PDF to S3. Filename: ${filename}, Url: ${url}`);
  // const s3Client = new S3Client({
  //   region: aws_config.region,
  //   credentials: {
  //     accessKeyId: aws_config.accessKeyId as string,
  //     secretAccessKey: aws_config.secretAccessKey as string,
  //   },
  // });
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_KEY as string,
      secretAccessKey: process.env.AWS_SECRET as string,
    },
    // If MINIO_ENDPOINT is defined, use it instead of AWS S3.
    ...(process.env.MINIO_ENDPOINT
      ? {
          endpoint: process.env.MINIO_ENDPOINT,
          forcePathStyle: true,
        }
      : {}),
  })
  const s3BucketName = aws_config.bucketName;
  const s3Key = `courses/${courseName}/${filename}`;

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const pdfBuffer = response.data;

  await s3Client.send(new PutObjectCommand({
    Bucket: s3BucketName,
    Key: s3Key,
    Body: pdfBuffer,
  }));

  console.log(`PDF uploaded to S3 at key: ${s3Key}`);
  return s3Key;
}

export async function ingestPdf(s3Key: string, courseName: string, base_url: string, url: string) {
  const ingestUrl = process.env.INGEST_URL || "https://app.beam.cloud/taskqueue/ingest_task_queue/latest";

  fetch(ingestUrl, {
    "method": "POST",
    "headers": {
      "Accept": "*/*",
      "Accept-Encoding": "gzip, deflate",
      "Authorization": `Bearer ${process.env.BEAM_API_KEY}`,
      "Content-Type": "application/json"
    },
    "body": JSON.stringify({
      base_url: base_url,
      url: url,
      readable_filename: path.basename(s3Key),
      s3_paths: s3Key,
      course_name: courseName,
    })
  })
    .then(response => response.text())
    // .then(text => {
    //   console.log(`IN PDF success case -- Data ingested for pdf: ${path.basename(s3Key)}`);
    //   console.log(text)
    // })
    .catch(err => console.error(err));
}
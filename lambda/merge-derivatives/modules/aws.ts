import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream} from 'fs';

const s3 = new S3Client({region: 'us-east-1'});

export async function uploadFile(bucket: string, filePath: string, key: string){
    try {
        console.log(`Uploading file: ${filePath + key}`);
      
        await uploadFileToS3(bucket, filePath, key);
        const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
        const expiresIn = 3600; // 1 hour expiration
        const presignedUrl = await getSignedUrl(s3, getObjectCommand, { expiresIn: expiresIn });

        console.log(`Pre-signed URL: ${presignedUrl}`);
        return presignedUrl;
    } catch (error) {
        throw error;
    }
}

async function uploadFileToS3(bucket: string, filePath: string, key: string) {
  try {
    const fileStream = createReadStream(filePath + key);

    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: 'application/zip'
    }

    await s3.send(new PutObjectCommand(params));
    console.log(`File uploaded to S3: s3://${bucket}/${key}`);
  } catch (error) {
    console.log(error);
    
    throw error;
  }
}

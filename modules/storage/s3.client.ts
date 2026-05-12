import { S3Client } from '@aws-sdk/client-s3';
import { env } from '@/modules/env';

const s3 = new S3Client({
  region: env.AWS_REGION || env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || env.AWS_S3_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || env.AWS_S3_SECRET_ACCESS_KEY || '',
  },
});

export { s3 };

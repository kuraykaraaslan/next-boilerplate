import { S3Client } from '@aws-sdk/client-s3'

// Legacy S3 client - kept for backward compatibility
// For new code, use StorageService with specific provider
const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_S3_SECRET_ACCESS_KEY || '',
  },
})

export { s3 }


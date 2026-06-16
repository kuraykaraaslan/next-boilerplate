import type { StorageProviderContribution, S3Config } from '@nb/storage/server/storage.provider.types';
import MinIOProvider from './providers/minio.provider';

/** MinIO storage provider contribution for the `storage:provider` point. */
const contribution: StorageProviderContribution = {
  key: 'minio',
  create(config: S3Config) {
    return new MinIOProvider(config);
  },
};

export default contribution;

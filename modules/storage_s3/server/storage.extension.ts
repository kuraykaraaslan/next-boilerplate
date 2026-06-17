import type { StorageProviderContribution, S3Config } from '@kuraykaraaslan/storage/server/storage.provider.types';
import AWSS3Provider from './providers/aws-s3.provider';

/** AWS S3 storage provider contribution for the `storage:provider` point. */
const contribution: StorageProviderContribution = {
  key: 'aws-s3',
  create(config: S3Config) {
    return new AWSS3Provider(config);
  },
};

export default contribution;

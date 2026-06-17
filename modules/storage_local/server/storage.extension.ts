import type { StorageProviderContribution, S3Config } from '@kuraykaraaslan/storage/server/storage.provider.types';
import LocalStorageProvider from './providers/local.provider';

/** Local filesystem storage provider contribution for the `storage:provider` point. */
const contribution: StorageProviderContribution = {
  key: 'local',
  create(config: S3Config) {
    return new LocalStorageProvider(config);
  },
};

export default contribution;

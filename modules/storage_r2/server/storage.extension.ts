import type { StorageProviderContribution, S3Config } from '@nb/storage/server/storage.provider.types';
import CloudflareR2Provider from './providers/cloudflare-r2.provider';

/** Cloudflare R2 storage provider contribution for the `storage:provider` point. */
const contribution: StorageProviderContribution = {
  key: 'cloudflare-r2',
  create(config: S3Config) {
    return new CloudflareR2Provider(config);
  },
};

export default contribution;

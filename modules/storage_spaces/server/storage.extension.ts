import type { StorageProviderContribution, S3Config } from '@nb/storage/server/storage.provider.types';
import DigitalOceanSpacesProvider from './providers/digitalocean-spaces.provider';

/** DigitalOcean Spaces storage provider contribution for the `storage:provider` point. */
const contribution: StorageProviderContribution = {
  key: 'digitalocean-spaces',
  create(config: S3Config) {
    return new DigitalOceanSpacesProvider(config);
  },
};

export default contribution;

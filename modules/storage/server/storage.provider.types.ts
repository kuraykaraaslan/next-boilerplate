import type BaseStorageProvider from './providers/base.provider';
import type { S3Config } from './storage.types';

export type { S3Config };

/**
 * The contract a satellite storage-provider module exports (as `default`) from
 * its `*.extension.ts`. Discovered by `storage.provider-factory` through the
 * extension registry (point `storage:provider`); the host never imports a
 * provider class directly. All storage providers share the same S3-compatible
 * config, so there are no per-provider setting keys — only a `create`.
 */
export interface StorageProviderContribution {
  /** Stable provider key, matching StorageProviderType (e.g. 'aws-s3'). */
  readonly key: string;
  /** Instantiate the provider for a resolved S3 config. */
  create(config: S3Config): BaseStorageProvider;
}

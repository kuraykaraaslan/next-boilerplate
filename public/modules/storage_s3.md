# Storage — AWS S3

- **id:** `storage_s3`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/storage_s3/`
- **tags:** storage, provider
- **icon:** `fas fa-hard-drive`
- **hasNextLayer:** false

AWS S3 storage backend for the storage module.

## Dependencies

- **requires:** `storage`, `env`, `setting`

## README

# storage_s3

AWS S3 storage provider satellite for the [`storage`](../storage) host module.
Contributes the `aws-s3` backend into the `storage:provider` extension point.
Enable/disable per tenant via `module.storage_s3.enabled`.

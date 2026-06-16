# Storage — MinIO

- **id:** `storage_minio`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/storage_minio/`
- **tags:** storage, provider
- **icon:** `fas fa-hard-drive`
- **hasNextLayer:** false

MinIO storage backend for the storage module.

## Dependencies

- **requires:** `storage`, `env`, `setting`

## README

# storage_minio

MinIO storage provider satellite for the [`storage`](../storage) host module.
Contributes the `minio` backend into the `storage:provider` extension point.
Enable/disable per tenant via `module.storage_minio.enabled`.

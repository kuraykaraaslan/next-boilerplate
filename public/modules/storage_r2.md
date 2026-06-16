# Storage — Cloudflare R2

- **id:** `storage_r2`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/storage_r2/`
- **tags:** storage, provider
- **icon:** `fas fa-hard-drive`
- **hasNextLayer:** false

Cloudflare R2 storage backend for the storage module.

## Dependencies

- **requires:** `storage`, `env`, `setting`

## README

# storage_r2

Cloudflare R2 storage provider satellite for the [`storage`](../storage) host module.
Contributes the `cloudflare-r2` backend into the `storage:provider` extension point.
Enable/disable per tenant via `module.storage_r2.enabled`.

# Storage — DigitalOcean Spaces

- **id:** `storage_spaces`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/storage_spaces/`
- **tags:** storage, provider
- **icon:** `fas fa-hard-drive`
- **hasNextLayer:** false

DigitalOcean Spaces storage backend for the storage module.

## Dependencies

- **requires:** `storage`, `env`, `setting`

## README

# storage_spaces

DigitalOcean Spaces storage provider satellite for the [`storage`](../storage) host module.
Contributes the `digitalocean-spaces` backend into the `storage:provider` extension point.
Enable/disable per tenant via `module.storage_spaces.enabled`.

# Storage — Local Filesystem

- **id:** `storage_local`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/storage_local/`
- **tags:** storage, provider
- **icon:** `fas fa-hard-drive`
- **hasNextLayer:** false

Local filesystem storage backend for the storage module. Writes objects to a directory on disk — intended for development and offline use (e.g. publishing community plugin bundles without S3).

## Dependencies

- **requires:** `storage`, `env`, `setting`

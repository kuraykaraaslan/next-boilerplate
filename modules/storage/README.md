# storage module

Multi-provider cloud storage abstraction. Unified S3-compatible API for upload (multipart or from URL), delete, and URL generation. Provider is selected from system settings.

---

## Files

| File | Purpose |
|---|---|
| `storage.service.ts` | Core: upload, delete, generateUrl, provider selection |
| `storage.types.ts` | `UploadOptions`, `UploadResult`, `S3Config` |
| `storage.dto.ts` | `UploadFileDTO` |
| `storage.enums.ts` | `StorageProvider` enum |
| `storage.messages.ts` | Error/success message strings |
| `storage.setting.keys.ts` | Setting key constants |
| `providers/base.provider.ts` | Abstract base class |
| `providers/aws-s3.provider.ts` | AWS S3 |
| `providers/cloudflare-r2.provider.ts` | Cloudflare R2 |
| `providers/digitalocean-spaces.provider.ts` | DigitalOcean Spaces |
| `providers/minio.provider.ts` | MinIO (self-hosted) |

---

## Providers

Active provider is selected from settings key `STORAGE_PROVIDER`. Supported values: `aws-s3`, `cloudflare-r2`, `digitalocean-spaces`, `minio`.

---

## Usage

```typescript
import StorageService from '@/modules/storage/storage.service';

// Upload a file
const result = await StorageService.upload(file, {
  folder: 'avatars',
  filename: `${userId}.webp`,
  tenantId,
});
// result.url, result.key, result.bucket, result.size, result.provider

// Delete a file
await StorageService.delete(result.key);

// Generate a signed URL (for private files)
const url = await StorageService.getSignedUrl(result.key, { expiresIn: 3600 });
```

---

## Upload Result

```typescript
type UploadResult = {
  url: string;
  key: string;
  bucket: string;
  size: number;
  provider: StorageProvider;
};
```

---

## Adding a New Provider

1. Extend `BaseStorageProvider` in `providers/`
2. Add to `StorageProvider` enum in `storage.enums.ts`
3. Register in `storage.service.ts` provider map
4. Add setting keys in `storage.setting.keys.ts`

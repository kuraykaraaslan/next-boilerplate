# Authoring a Drive plugin

Drive is extensible through four sandboxed extension points. A plugin is just a
satellite module that declares a contribution in its own `module.json` and ships
a default-exported implementation of the matching contract from
[`server/drive.plugin-types.ts`](./server/drive.plugin-types.ts).

Contributions run in the platform's plugin isolate and are invoked host-side via
`invoke(op, input)`. The host never hands a plugin a storage secret — file bytes
are reached only through the short-lived **presigned URL** passed into each op.

## 1. Declare the contribution

`modules/drive_office_preview/module.json`:

```json
{
  "$schema": "../module.schema.json",
  "id": "drive_office_preview",
  "name": "Drive Office Preview",
  "version": "1.0.0",
  "dependencies": { "requires": ["drive"] },
  "extensions": [
    {
      "point": "drive:preview",
      "key": "office",
      "export": "drive_office_preview/server/office.extension",
      "metadata": {
        "label": "Office Preview",
        "mimeGroups": ["documents", "spreadsheets", "presentations"]
      }
    }
  ],
  "sandbox": {
    "runtime": "isolated",
    "capabilities": ["http"],
    "httpAllowlist": ["view.officeapps.live.com"],
    "limits": { "memoryMb": 64, "timeoutMs": 30000 }
  }
}
```

`metadata.mimeTypes` / `metadata.mimeGroups` let the host filter applicability
*without* entering the isolate. Omit both to claim every type (wildcard).

## 2. Implement the contract

`modules/drive_office_preview/server/office.extension.ts`:

```ts
import type { DrivePreviewContribution } from '@kuraykaraaslan/drive/server/drive.plugin-types';

const contribution: DrivePreviewContribution = {
  key: 'office',
  async render({ presignedUrl }) {
    // Hand off to an embeddable viewer (URL is short-lived).
    const iframeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(presignedUrl)}`;
    return { iframeUrl };
  },
};

export default contribution;
```

Export it from the satellite's `package.json` (the `export` path above must
match an `exports` entry) and run `npm run registry:snapshot`.

## Contracts at a glance

| Point             | Ops the host calls                         | Returns                            |
| ----------------- | ------------------------------------------ | ---------------------------------- |
| `drive:preview`   | `render({ presignedUrl, mimeType })`       | `{ html?, iframeUrl? }`            |
| `drive:action`    | `run({ driveFileId, presignedUrl, mimeType })` | `{ resultUrl?, message? }`     |
| `drive:source`    | `list({ path })`, `read({ externalId })`   | entries / `{ url, mimeType? }`     |
| `drive:lifecycle` | `onUploaded` / `onDeleted` / `onMoved`     | ignored (fire-and-forget)          |

A broken or absent plugin never breaks core Drive: preview falls back to the
built-in renderers, action lists simply omit it, and lifecycle errors are logged
and swallowed.

# tenant_export

GDPR Article 20 (data portability) — allows a tenant OWNER to download all tenant data as a structured JSON file.

## What it does

`TenantExportService.exportTenantData(tenantId)` queries the tenant's own database via `tenantDataSourceFor(tenantId)` and returns a `Buffer` containing a formatted JSON document with the following collections:

| Field        | Source entity      | Notes                                      |
|--------------|--------------------|--------------------------------------------|
| `members`    | `TenantMember`     | All member rows (role, status, timestamps) |
| `domains`    | `TenantDomain`     | All custom domains and their verification status |
| `auditLogs`  | `TenantAuditLog`   | Last 1 000 entries, ordered newest-first   |
| `webhooks`   | `Webhook`          | Endpoint config; **signing secret omitted** |
| `settings`   | `TenantSetting`    | All key/value settings rows; `null` if none |

## What it omits

- **Webhook signing secrets** (`secret` column) — HMAC-SHA256 secrets are stripped before serialisation.
- **User passwords** — passwords live on the `User` entity in the system database, not in the tenant DB.

## Response format

```json
{
  "exportedAt": "2026-05-08T12:00:00.000Z",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "members": [ ... ],
  "domains": [ ... ],
  "auditLogs": [ ... ],
  "webhooks": [ ... ],
  "settings": [ ... ]
}
```

## HTTP endpoint

```
POST /tenant/:tenantId/api/export
```

- **Auth required:** Yes — tenant session cookie with `OWNER` role.
- **Rate limited:** Yes (shared `api` bucket via `Limiter`).
- **Response:** `200 application/json` with `Content-Disposition: attachment` so browsers prompt a file download.
- **Filename pattern:** `tenant-export-{tenantId}-{YYYY-MM-DD}.json`

## Usage (server-side)

```typescript
import TenantExportService from '@/modules/tenant_export/tenant_export.service';

const buffer = await TenantExportService.exportTenantData(tenantId);
// buffer is a UTF-8 JSON Buffer ready to stream or write to storage
```

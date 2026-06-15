# Good to Have — Storage

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## ✅ Security hardening shipped (no mock)

- **Upload validation** (`storage.validation.ts`) runs before any byte reaches
  the bucket: size (`maxFileSizeMb`), extension allowlist (`allowedExtensions`),
  and **magic-byte sniffing** so `evil.exe` renamed to `cat.png` is rejected.
- **Content-derived MIME validation** — the real MIME is derived from the
  (magic-byte-verified) content via `deriveMimeType`, enforced against the
  per-tenant allowlist, and stamped onto the stored object + audit row instead of
  the client's spoofable `file.type` header. The allowlist is configured by
  **group** (`allowedMimeGroups`: images, documents, spreadsheets, presentations,
  archives, audio, video, data — `storage.mime-groups.ts`), optionally augmented
  with explicit `allowedMimeTypes`.
- **Online virus scanning** — pluggable scanner abstraction + VirusTotal adapter,
  sync (block) or async (quarantine) per tenant. See "Virus / Malware Scanning".
- **EXIF/metadata stripping** — JPEG APPn/COM segments (GPS, device, thumbnail)
  removed by default (pure JS, `imageStripExif` setting; off via `'false'`).
- **Presigned GET URLs** (`storage.sigv4.ts`) — real AWS SigV4 query signing
  with expiry, no extra dependency; works for S3/R2/Spaces/MinIO.
- **GDPR/KVKK hard delete** — `hardDeleteFile()` purges the object AND the audit
  row (not soft-delete) and decrements the byte counter.

## Data Residency and GDPR

### GDPR / KVKK Data Residency Enforcement
**Why:** The `s3Region` setting is tenant-configurable but nothing enforces that a tenant classified as an EU data controller stores personal-data-containing files in an EU region; a misconfigured or default `us-east-1` bucket for an EU tenant is a GDPR Art. 44 cross-border transfer violation.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant classification (EU, TR, US, global) must drive a hard constraint on which bucket regions are permissible; the enforcement belongs in the platform layer, not left to each tenant admin to self-configure correctly.
**Multi-country relevance:** GDPR requires EU-resident personal data to remain in the EU or an adequate-protection country; Turkish KVKK requires Turkish citizen data in Turkish-region storage; Chinese PIPL requires Chinese user data stored on-shore; one region constraint per tenant's operating country is the minimum viable data-residency model.

### Per-Country Bucket Configuration
**Why:** Each tenant has exactly one configured bucket; a tenant operating in both the EU and Turkey must choose one region, violating data residency requirements for the other country's users, because there is no model for routing uploads to different buckets based on the data subject's country.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants serving multiple regulated jurisdictions need a per-country bucket map (`EU → eu-central-1 bucket`, `TR → Turkish-region bucket`) with automatic routing at upload time based on the context (e.g., user's registered country).
**Multi-country relevance:** This is directly required by GDPR, KVKK, and PIPL; without it, the platform cannot legally serve regulated multi-country tenants.

### ✅ GDPR Right to Erasure (Hard Delete)
**Why:** `deleteFile` soft-removes the `UploadedFile` audit row (`deletedAt` set) but the data remains in the S3 bucket and the audit row persists indefinitely; GDPR Art. 17 requires the ability to permanently erase personal data on request, which neither the S3 delete nor the soft-delete currently achieves end-to-end.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's data erasure requests are independent; a GDPR erasure for a user in tenant A must not affect tenant B's data; the audit row purge must be tenant-scoped.
**Multi-country relevance:** EU GDPR Art. 17, Turkey KVKK Art. 7, Brazil LGPD Art. 18 all mandate the right to erasure; UK GDPR retains this post-Brexit; hard delete is a compliance requirement across every major market in which the platform operates.

---

## File Validation and Security

### ✅ maxFileSizeMb Enforcement
**Why:** The `maxFileSizeMb` setting is declared, seeded (25 MB default), and editable in the UI, but `uploadFile` and `uploadFromUrl` never read it; uploads of any size succeed, bypassing the per-tenant file size policy.
**Complexity:** Low
**Multi-tenant relevance:** Subscription plan tiers commonly enforce different max file sizes (free tier: 10 MB, pro: 50 MB, enterprise: 500 MB); without enforcement, any tenant can upload arbitrarily large files regardless of their plan.
**Multi-country relevance:** No direct country-specific driver, but mobile-first markets (Turkey, LatAm, Africa) upload content from slower connections; smaller max file sizes incentivise optimised uploads and reduce storage cost for the platform operator in those regions.

### ✅ allowedExtensions Enforcement
**Why:** The `allowedExtensions` setting is declared, seeded (`["png","jpg","pdf"]`), and UI-editable, but no code reads it to validate the uploaded file's extension or MIME type; any file type can be uploaded regardless of the tenant's configured allowlist.
**Complexity:** Low
**Multi-tenant relevance:** A legal-services tenant may want to restrict uploads to PDFs only; a media tenant may allow video files; without enforcement, both tenants accept the same unrestricted set of file types.
**Multi-country relevance:** Some file types are legally restricted in certain countries (e.g., encrypted container formats banned in some jurisdictions, or executable file upload restrictions mandated for government-facing platforms); per-tenant allowlists enable country-specific compliance without platform-wide restrictions.

### ✅ MIME Type Sniffing / Magic-Byte Validation
**Why:** The service trusts `file.type` from the multipart upload, which is a client-supplied header; a malicious actor can upload an executable disguised as a PNG by setting `Content-Type: image/png` while the bytes are a PE binary, bypassing extension checks and potentially serving malware from the CDN.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's upload surface is independently exposed; a file uploaded to tenant A's bucket that is incorrectly typed does not affect tenant B, but both tenants share the platform's reputation risk if malware is served from the CDN domain.
**Multi-country relevance:** GDPR, UK Online Safety Act, and Australian Online Safety Act all impose platform liability for hosting and serving malware; magic-byte validation is a baseline security control required for compliance in multiple markets.

### ✅ Virus / Malware Scanning
**Status:** Shipped. Pluggable online scanner abstraction (`scanners/base.scanner.ts`,
first adapter `scanners/virustotal.scanner.ts`) wired into the upload flow with a
per-tenant **hybrid** model (`virusScanMode = sync | async`):
- **sync** — the buffer is scanned BEFORE it reaches the bucket; an infected file
  is rejected with `STORAGE_MESSAGES.SCAN_INFECTED` and never stored.
- **async** — the object is stored as `scanStatus='pending'` and a BullMQ job
  (`storage.scan.job.ts`) downloads it via a presigned URL, scans it, writes the
  result to the `UploadedFile` scan columns, and quarantines/deletes it if infected
  (`virusScanInfectedAction = quarantine | delete`).

Settings: `virusScanEnabled`, `virusScanMode`, `virusScanProvider`, `virusScanApiKey`,
`virusScanTimeoutSeconds`, `virusScanInfectedAction`, `virusScanQuarantineFolder`
(`STORAGE_SCAN_KEYS`). `uploadFromUrl` always scans asynchronously; server-generated
buffers (`uploadServerBuffer`) are trusted and not scanned.

**Why:** There is no antivirus scan of uploaded files before the `UploadedFile` audit row is created and the URL is returned; a tenant user can upload a malware-containing PDF that is immediately accessible to all gallery/document consumers.
**Complexity:** High
**Multi-tenant relevance:** A malware upload in one tenant's storage does not automatically cross-contaminate other tenants' buckets (per-tenant bucket isolation), but a shared CDN domain means the platform's reputation is impacted if malware is served from any tenant.
**Multi-country relevance:** EU NIS2 Directive, UK Cyber Security Act, and US CISA guidelines all treat malware scanning of hosted content as a baseline security control for digital service providers; non-compliance creates regulatory exposure.

---

## Multi-Region and CDN

### Multi-Region Replication Policy per Tenant
**Why:** Each tenant uses a single-region bucket; there is no mechanism to configure cross-region replication (S3 CRR, Cloudflare R2 global replication) so that uploaded files are served with low latency from edge locations near the user's country.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants with global user bases need per-tenant replication policies; a startup tenant on a free plan may only need one region, while a global tenant on an enterprise plan may need active-active multi-region.
**Multi-country relevance:** CDN latency for serving product images or documents is a direct UX and SEO factor; a Turkish user fetching product images from a US-only bucket experiences 150-250ms additional latency compared to a regionally-replicated alternative, directly impacting conversion rates.

### ✅ Presigned URL Generation with Expiry
**Why:** `getFileUrl` returns the stored `url` (typically a public CDN URL); there is no support for generating time-limited presigned URLs for private/access-controlled files, which is required for secure document download links sent in emails or for gated content.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with private documents (signed contracts, invoices, KYC documents) need short-lived presigned URLs; all-public CDN URLs expose those documents to anyone who discovers the URL.
**Multi-country relevance:** GDPR and KVKK impose access controls on documents containing personal data; a presigned URL with a short expiry (15 minutes) is the standard mechanism for compliant, time-limited access to personal-data-containing files in regulated markets.

### ✅ Storage Byte Counter Decrement on Delete
**Why:** `TenantUsageService.incrementStorageBytes` is called on upload but there is no corresponding decrement on `deleteFile`; the `storageBytes` counter in `tenant_usage` only ever goes up, causing the quota check to become increasingly inaccurate over time as tenants delete files.
**Complexity:** Low
**Multi-tenant relevance:** Tenants that regularly cycle their product images (delete old, upload new) will hit a falsely-inflated quota ceiling, blocking new uploads even though their actual storage footprint is within the plan limit.
**Multi-country relevance:** Storage-heavy markets (high-resolution product images for luxury goods in France/Italy, medical imaging documents in regulated healthcare tenants) produce large file sizes; inaccurate quota counters are most painful in tenants with high delete-and-replace workflows.

---

## Audit and Compliance

### Upload Origin Tracking (IP, User Agent, Country)
**Why:** The `UploadedFile` entity records `userId` but not the IP address, user agent, or inferred country from which the upload originated; this information is required for fraud investigation and GDPR audit responses ("who uploaded this file from where?").
**Complexity:** Low
**Multi-tenant relevance:** Per-tenant audit logs of upload origins help tenant admins detect unusual upload patterns (e.g., bulk uploads from an unknown IP after credential compromise).
**Multi-country relevance:** GDPR data breach notification requirements (72-hour window to report to the relevant DPA) require knowing from which country an upload/exfiltration originated; IP-to-country mapping on the audit row enables this.

### ✅ File Metadata Extraction (EXIF Stripping)
**Why:** Image files uploaded via `uploadFile` may contain EXIF metadata including GPS coordinates, device serial numbers, and photographer identity; these are personal data under GDPR and must be stripped before the file is served publicly.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants whose users upload images from mobile devices (real estate photos, profile pictures, product photos taken on-site) are at risk; stripping EXIF server-side removes the risk uniformly regardless of tenant.
**Multi-country relevance:** GDPR Art. 5(1)(c) data minimisation principle requires that personal data not be retained beyond its processing purpose; EXIF GPS data in a product image served publicly is unnecessary personal data that GDPR requires to be stripped.

---

## Developer Experience

### Folder Taxonomy Extensibility
**Why:** `StorageFolder` is a hardcoded Zod enum (`general`, `categories`, `users`, `posts`, etc.); adding a new folder type for a new module requires editing the enum in the storage module, coupling all modules to the storage enum.
**Complexity:** Low
**Multi-tenant relevance:** Modules added for specific tenant verticals (e.g., `legal-docs` for a legal-tech tenant, `medical-records` for a health tenant) cannot define their own folder without modifying the core storage module.
**Multi-country relevance:** Country-specific compliance may require separate folder namespaces (e.g., `gdpr-exports` folder with a separate retention policy); a dynamic folder model enables this without core module changes.

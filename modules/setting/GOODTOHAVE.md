# Good to Have — Setting

> All selected items shipped.

## Value Safety and Validation

### ✅ Per-Key Schema Validation on Write
`validateSettingValue(key, value)` in `setting.service.ts` validates `defaultTimezone` against `Intl.DateTimeFormat` (IANA check) and `currencyCode`/`defaultCurrency` against the ISO 4217 set before persisting.

### ✅ Sensitive Value Encryption at Rest
`SENSITIVE_KEYS` set in `setting.service.ts` lists all secret-class keys (API keys, SMTP passwords, Stripe secrets, etc.). Values for these keys are transparently encrypted on write via `encryptFieldOpt` (AES-256-GCM from `common/field-encryption.ts`) and decrypted on read.

### ✅ Setting Value Masking in Admin API Responses
`parseRow(row, masked=true)` replaces sensitive values with `***SET***` in API responses. Pass `masked=true` to `getAll()` / `getByKey()` from admin routes.

---

## Hierarchical and Inherited Settings

### ✅ Platform-Level Default → Tenant Override Inheritance
`resolveValue(tenantId, key)` first queries the tenant's own row; if absent it falls back to the `ROOT_TENANT_ID` row. `getByKeys` applies the same pattern for batch reads.

### ✅ Read-Only (Locked) Settings
`Setting.isLocked` column (boolean, default false). `create`, `update`, and `updateMany` throw `403 FORBIDDEN` for locked keys. `setLocked(tenantId, key, isLocked)` is the platform-operator API.

### Setting Groups as Typed Namespaces with Metadata
**Why:** No metadata (display name, icon, order) on groups.
**Complexity:** Low — not yet implemented.

---

## Change Management

### ✅ Setting Change Audit Log
`emitAuditLog(...)` is called after every `create`, `update`, `updateMany`, and `delete` with `action = 'setting.created'` etc. Integrates with `AuditLogService.log`.

### Setting Change Webhooks / Event Emission
**Why:** Consuming modules can't be notified in real time when a setting changes.
**Complexity:** Medium — not yet implemented.

### ✅ Setting Import / Export (JSON Bundle) → Per-Plan Templates ★ New Feature
`applyTemplate(tenantId, templateName)` applies a named settings bundle from `setting.templates.ts` (currently: `starter`, `pro`, `enterprise`). Equivalent to import/export for provisioning flows.

---

## Localization Settings

### ✅ IANA Timezone Validation
`isValidIANATimezone(tz)` uses `Intl.DateTimeFormat` to reject non-IANA strings at write time.

### ✅ ISO 4217 Currency Code Validation
`isValidISO4217(code)` validates against a curated `ISO4217_CODES` set. Applied to `currencyCode` and `defaultCurrency` keys.

### Multi-Language UI Configuration (Tenant Admin Language)
**Why:** No separate setting for admin UI language vs storefront language.
**Complexity:** Low — not yet implemented.

---

## Performance

### ✅ Bulk Cache Invalidation via Redis Pattern Match
`clearCache(tenantId)` uses `SCAN + UNLINK` on pattern `settings:<tenantId>:*` — one round trip per 100 keys instead of O(N) DB reads and sequential DEL calls.

---

## Version History & Rollback ★ New Feature

### ✅ Setting Rollback / Version History
`SettingHistory` entity records `previousValue`/`newValue` on every write. `getHistory(tenantId, key)` returns the last 50 changes. `rollback(tenantId, key, historyId)` restores a prior value.

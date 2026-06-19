# Tenant Branding

- **id:** `tenant_branding`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant_branding/`
- **tags:** tenant, branding, white-label
- **icon:** `fas fa-palette`
- **hasNextLayer:** true

White-label branding: logo, favicon, colors, font, custom CSS — read by the proxy/shell to render per-tenant chrome.

## Dependencies

- **requires:** `db`, `setting`, `storage`

## Services

- `tenant_branding.service.ts`

## Setting keys

- `tenant_branding.setting.keys.ts`

## Next layer (modules_next/) surface

- `tenant_branding/ui/settings-branding.page` _(ui, client)_
- `tenant_branding/ui/use-tenant-branding.hook` _(ui, client)_

## README

# Tenant Branding Module

Per-tenant white-label branding: brand name, tagline, logos, favicon, colors, custom CSS/JS, and auth wallpaper. Values are stored as setting key-value pairs (via `setting`) and read by the proxy/shell to render per-tenant chrome. No global defaults — each tenant is fully isolated.

---

## Entities

This module has no entities of its own. All branding values are persisted as tenant-scoped setting key-value pairs through `SettingService` (`setting` module), which stores them in the **tenant DB**.

---

## Services / Responsibilities

| Service | Method | Responsibility |
|---|---|---|
| `TenantBrandingService` | `get(tenantId)` | Reads all branding keys for the tenant via `SettingService.getByKeys`, then validates/parses them with `TenantBrandingSchema`. Missing keys are returned as `undefined`. |
| `TenantBrandingService` | `update(tenantId, data)` | Writes only the provided keys via `SettingService.updateMany`; skips the write entirely when no recognized keys are present. Returns the freshly re-read branding. |
| `TenantBrandingService` | `reset(tenantId)` | Deletes every branding key for the tenant via `SettingService.delete`, ignoring per-key errors, reverting the tenant to platform defaults. |

---

## Branding Fields

`TenantBranding` (from `tenant_branding.types.ts`, all fields optional strings):

```typescript
type TenantBranding = {
  brandName?: string;          // display name shown in UI chrome, emails, docs
  brandTagline?: string;       // short descriptor displayed alongside logo
  brandLogoLight?: string;     // URL — logo for light theme
  brandLogoDark?: string;      // URL — logo for dark theme
  brandFavicon?: string;       // URL — favicon asset
  brandPrimaryColor?: string;  // hex color — buttons, links, accents
  brandSecondaryColor?: string;// hex color — alternate UI elements
  authWallpaper?: string;      // URL — background on login/signup pages
  customCss?: string;          // injected into <head>
  customJs?: string;           // injected before </body>
};
```

`tenant_branding.types.ts` also exports `TenantBrandingStateSchema` / `TenantBrandingState` (`{ tenantId, branding, isLoading, error }`) for client-side state.

---

## Usage

```typescript
import TenantBrandingService from '@/modules/tenant_branding/tenant_branding.service';

// Read branding
const branding = await TenantBrandingService.get(tenantId);

// Update branding (only the provided keys are written)
await TenantBrandingService.update(tenantId, {
  brandPrimaryColor: '#6366f1',
  brandLogoLight: 'https://cdn.example.com/logo-light.svg',
});

// Reset all branding back to platform defaults
await TenantBrandingService.reset(tenantId);
```

---

## API Routes

`app/tenant/[tenantId]/api/settings/branding/route.ts`:

| Method | Path | Scope | Description |
|---|---|---|---|
| `GET` | `/tenant/[tenantId]/api/settings/branding` | `tenant:admin` | Returns the tenant's branding |
| `PUT` | `/tenant/[tenantId]/api/settings/branding` | `tenant:admin` | Validates the body with `TenantBrandingSchema` and updates branding |
| `DELETE` | `/tenant/[tenantId]/api/settings/branding` | `tenant:owner` | Resets all branding to defaults |

All routes are rate-limited and authenticated via `TenantSessionNextService.authenticateTenantByRequest`.

---

## Settings

Branding values are themselves setting keys, enumerated by `TenantBrandingSettingKeySchema` in `tenant_branding.setting.keys.ts` (exposed as `TENANT_BRANDING_KEYS`):

`brandName`, `brandTagline`, `brandLogoLight`, `brandLogoDark`, `brandFavicon`, `brandPrimaryColor`, `brandSecondaryColor`, `authWallpaper`, `customCss`, `customJs`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

White-label branding module that stores per-tenant logos, colors, favicon, custom CSS/JS, and auth wallpaper as setting key-value pairs, with full tenant isolation and no global defaults.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `brandName` | string | — | tenant | Tenant admin — display name shown in UI chrome, emails, docs | `tenant_branding.service.ts` |
| `brandTagline` | string | — | tenant | Tenant admin — short descriptor displayed alongside logo | `tenant_branding.service.ts` |
| `brandLogoLight` | string | — | tenant | Tenant admin — URL to logo asset for light theme | `tenant_branding.service.ts` |
| `brandLogoDark` | string | — | tenant | Tenant admin — URL to logo asset for dark theme | `tenant_branding.service.ts` |
| `brandFavicon` | string | — | tenant | Tenant admin — URL to favicon asset | `tenant_branding.service.ts` |
| `brandPrimaryColor` | string | — | tenant | Tenant admin — primary brand color (hex) applied to buttons, links, accents | `tenant_branding.service.ts` |
| `brandSecondaryColor` | string | — | tenant | Tenant admin — secondary brand color (hex) for alternate UI elements | `tenant_branding.service.ts` |
| `authWallpaper` | string | — | tenant | Tenant admin — URL to background image displayed on login/signup pages | `tenant_branding.service.ts` |
| `customCss` | text | — | tenant | Tenant admin — custom CSS injected into <head> for white-label theming | `tenant_branding.service.ts` |
| `customJs` | text | — | tenant | Tenant admin — custom JavaScript injected before </body> | `tenant_branding.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Per-tenant behavior

- `tenant_branding.service.ts:get` — Reads branding keys from SettingService for the request tenantId; each tenant has its own logo, colors, CSS/JS
- `tenant_branding.service.ts:update` — Updates branding keys for the request tenantId; changes only affect that tenant's chrome/UI rendering
- `tenant_branding.service.ts:reset` — Deletes all branding keys for the request tenantId, reverting that tenant to platform defaults
- `app/tenant/[tenantId]/api/settings/branding/route.ts:GET` — Returns branding for the tenant in the URL parameter; response is tenant-specific
- `app/tenant/[tenantId]/api/settings/branding/route.ts:PUT` — Updates branding for the tenant in the URL parameter; requires tenant:admin role
- `app/tenant/[tenantId]/api/settings/branding/route.ts:DELETE` — Resets branding for the tenant in the URL parameter; requires tenant:owner role

---

## Dependencies

Requires: `db`, `tenant_setting`, `storage`. Reads/writes branding values through `setting` (`SettingService`); API routes depend on `tenant_session` (auth) and `limiter` (rate limiting).

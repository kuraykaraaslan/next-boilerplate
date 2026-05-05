# tenant_branding module

Per-tenant branding settings: colors, logos, favicon, custom CSS/JS, and auth wallpaper. Built on top of `tenant_setting`.

---

## Files

| File | Purpose |
|---|---|
| `tenant_branding.service.ts` | Core: get and update branding settings |
| `tenant_branding.types.ts` | `TenantBranding` type |
| `tenant_branding.setting.keys.ts` | Setting key constants scoped to branding |

---

## Branding Fields

```typescript
type TenantBranding = {
  logoLight?: string;     // URL — logo for light mode
  logoDark?: string;      // URL — logo for dark mode
  favicon?: string;       // URL
  primaryColor?: string;  // hex color
  secondaryColor?: string;
  tagline?: string;
  customCss?: string;     // injected into <head>
  customJs?: string;      // injected before </body>
  authWallpaper?: string; // URL — background on auth pages
};
```

---

## Usage

```typescript
import TenantBrandingService from '@/modules/tenant_branding/tenant_branding.service';

// Read branding
const branding = await TenantBrandingService.get(tenantId);

// Update branding
await TenantBrandingService.update(tenantId, {
  primaryColor: '#6366f1',
  logoLight: 'https://cdn.example.com/logo-light.svg',
});
```

---

## API Routes

```
GET /tenant/[tenantId]/api/branding
PUT /tenant/[tenantId]/api/branding
```

Requires `tenant:admin` scope.

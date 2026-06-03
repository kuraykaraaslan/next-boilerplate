# User Agent Module

Stateless utility for parsing User-Agent strings (OS, browser, device type via regex patterns) and resolving an IP address to an approximate geo-location (via ip-api.com, with local/private-IP filtering). Used by `auth` and `user_session` to label login sessions with device + location.

---

## Services

`UserAgentService` (default export, all static):

| Method | Description |
|---|---|
| `getDeviceAndLocation(userAgent, ip)` | Convenience wrapper — returns `{ deviceInfo, geoLocation, location }` in one call. Null-safe on both inputs. |
| `parseUserAgent(userAgent)` | Parse a UA string into `DeviceInfo` (OS, browser, versions, device type, human-readable device name). |
| `getGeoLocation(ip)` | Look up `GeoLocation` for an IP via ip-api.com. Returns all-null fields for empty/local/private IPs (`127.0.0.1`, `localhost`, `192.168.*`, `10.*`) or on any failure. |
| `formatLocation(geo)` | Format a `GeoLocation` into a `"City, State, Country"` string, or `"Unknown"`. |

Private helpers: `detectOS`, `detectBrowser`, `detectDeviceType`, `extractVersion`, `generateDeviceName`.

---

## Types & Enums

```typescript
type DeviceInfo = {
  osName: OSName;                 // Windows | macOS | Android | iOS | Chrome OS | Linux | Unix | Unknown
  osVersion: string | null;
  browserName: BrowserName;       // Chrome | Firefox | Safari | Edge | IE | Opera | Postman | Unknown
  browserVersion: string | null;
  deviceType: DeviceType;         // Mobile | Tablet | Desktop
  deviceName: string | null;      // e.g. "Mobile - iOS - Safari"
};

type GeoLocation = {
  city: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
};
```

Enums are defined as Zod schemas in `user_agent.enums.ts`: `OSNameEnum`, `DeviceTypeEnum`, `BrowserNameEnum`.

---

## Usage

```typescript
import UserAgentService from '@/modules/user_agent/user_agent.service';

// Parse a UA string
const device = UserAgentService.parseUserAgent(req.headers['user-agent'] ?? '');
// { osName: 'macOS', browserName: 'Chrome', deviceType: 'Desktop', deviceName: 'macOS - Chrome', ... }

// Geo-locate an IP (all-null fields for local/private IPs)
const geo = await UserAgentService.getGeoLocation(req.ip);
// { city: 'Istanbul', country: 'Turkey', countryCode: 'TR', ... }

// Or both at once
const { deviceInfo, geoLocation, location } =
  await UserAgentService.getDeviceAndLocation(req.headers['user-agent'] ?? null, req.ip ?? null);
```

---

## Usage in Auth

`auth.service.ts` and `user_session` call `getDeviceAndLocation` on every login to populate the `DeviceInfo` + `GeoLocation` shown in the active-sessions panel.

> Geo-location uses the free ip-api.com tier (45 req/min, plain HTTP). It is a shared, platform-wide dependency — no API key and no per-tenant configuration.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — stateless User-Agent parsing and IP geo-location utility with no tenant-scoped state, settings, or data.

---

## Dependencies

- `@/modules/logger` — warns/errors on geo-lookup failures.

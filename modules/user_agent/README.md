# user_agent module

User-Agent string parsing and geo-location lookup. Detects OS, browser, device type via regex patterns. Uses ip-api.com for geo-location with local IP filtering.

---

## Files

| File | Purpose |
|---|---|
| `user_agent.service.ts` | Core: parse UA string, lookup geo-location |
| `user_agent.types.ts` | `DeviceInfo`, `GeoLocation` |
| `user_agent.enums.ts` | `DeviceType`, `OSName`, `BrowserName` enums |

---

## Types

```typescript
type DeviceInfo = {
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  deviceName: string;
};

type GeoLocation = {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
};
```

---

## Usage

```typescript
import UserAgentService from '@/modules/user_agent/user_agent.service';

// Parse UA string
const device = UserAgentService.parse(request.headers['user-agent'] ?? '');
// { osName: 'macOS', browserName: 'Chrome', deviceType: 'Desktop', ... }

// Geo-locate an IP (returns null for local/private IPs)
const geo = await UserAgentService.geolocate(request.ip);
// { city: 'Istanbul', country: 'Turkey', ... } or null
```

---

## Usage in Auth

This module is used by `auth.service.ts` and `user_session` to populate `DeviceInfo` and `GeoLocation` on every login, which is then shown in the active sessions panel.

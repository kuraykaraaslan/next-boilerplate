# Good to Have — User Agent Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Security

### Anomaly / Suspicious Login Detection
**Why:** The module parses device and location data but never compares it against the user's history to flag logins from unexpected countries or device types, a common account-takeover signal.
**Complexity:** High
**Multi-tenant relevance:** Tenants with different risk tolerances (e.g., banking vs. blog) should be able to configure the sensitivity threshold and the response action (notify, block, step-up MFA).
**Multi-country relevance:** A login that crosses international boundaries within an impossible travel window is a strong fraud signal; accurate country-level data from `countryCode` is the prerequisite.

### Configurable Geo-IP Provider (Replace ip-api.com)
**Why:** The current implementation relies on a free, unauthenticated, rate-limited (45 req/min) HTTP endpoint; under production load this will hit the limit and silently return null geo data, and the plain HTTP request leaks IPs.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants may require an on-premise or paid geo-IP solution (MaxMind GeoIP2, ipinfo.io) that can be swapped per deployment; the setting keys for MaxMind credentials already exist in `user_security.setting.keys.ts` but are never wired into this module.
**Multi-country relevance:** Accurate country-level data is required to enforce data residency, apply regional rate limits, and comply with IP-blocking sanctions (OFAC, EU restrictive measures).

### Geo-IP Redis Caching
**Why:** Every session creation makes an outbound HTTP call to ip-api.com; repeated requests for the same IP (shared offices, NATs) are not cached, wasting the rate-limit budget and adding latency on every login.
**Complexity:** Low
**Multi-tenant relevance:** High-volume tenants with many concurrent logins from the same corporate IP would exhaust the rate limit faster; caching protects shared quota.
**Multi-country relevance:** No direct multi-country impact, but is a prerequisite for reliable geo-data used in country-based decisions.

### VPN / Proxy / Tor Detection Flag
**Why:** ip-api.com's free tier does not include proxy/VPN/Tor detection; the module currently has no `isVpn` or `isTor` field, making it impossible for tenants to require or block VPN usage.
**Complexity:** Medium
**Multi-tenant relevance:** Financial or compliance tenants may need to block logins from anonymizing proxies; a flag in the session allows tenant-level enforcement without changing this service.
**Multi-country relevance:** Certain jurisdictions restrict VPN use (China, Russia, Iran); knowing if the IP is a VPN endpoint is required to enforce or log compliance.

---

## Localization

### IPv6 Support Verification
**Why:** The `isPrivateOrReservedIp` helper covers common IPv6 ranges (`::1`, `fe80:`, `fc`, `fd`) but does not exhaustively handle all special-purpose IPv6 blocks (e.g., `2001:db8::/32` documentation range, `100::/64` discard prefix), which could cause geo-lookups on reserved addresses.
**Complexity:** Low
**Multi-tenant relevance:** Not tenant-specific, but correctness matters for any tenant deploying on IPv6-only infrastructure.
**Multi-country relevance:** IPv6 adoption is higher in some regions (Asia-Pacific, parts of Europe); the module must handle it correctly as those user bases grow.

### Country-Based Locale Inference
**Why:** The `GeoLocation` result includes `countryCode` but no derived `locale` or `languageCode`; callers (auth, session) cannot use the geo result to auto-populate a user's preferred language on first login.
**Complexity:** Low
**Multi-tenant relevance:** Tenants that auto-configure language on signup benefit from a derived locale suggestion rather than requiring the user to set it manually.
**Multi-country relevance:** Mapping `countryCode` → `locale` (e.g., `TR` → `tr-TR`, `DE` → `de-DE`) is essential for serving correctly localized welcome emails and UIs on first-time logins.

---

## Developer Experience

### User-Agent Client Hints Support
**Why:** Modern browsers (Chrome 89+, Edge 89+) are progressively phasing out the traditional `User-Agent` header in favour of the `Sec-CH-UA` / `Sec-CH-UA-Platform` client-hint headers; the current regex-based parser will degrade as UA strings are frozen.
**Complexity:** Medium
**Multi-tenant relevance:** None specific, but all tenants share the same parser; a silent degradation to `Unknown` device/OS affects session-label accuracy for all.
**Multi-country relevance:** Browser market share differs by region; Chrome and Chromium-based browsers dominate in many markets where client hints are already standard.

### Bot / Crawler Detection
**Why:** The module identifies Postman as a known "browser" but has no general bot/crawler detection; automated traffic incorrectly appears as `Desktop` sessions, inflating active-session counts.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with analytics dashboards or session-count billing need bots excluded from user-session metrics.
**Multi-country relevance:** No direct multi-country dependency, but bot traffic patterns vary by geography (e.g., scraping bots may originate disproportionately from certain regions).

### Pluggable UA Parsing Library
**Why:** The current implementation is a hand-rolled regex parser that will miss edge cases (new OS versions, headless browsers, smart TVs, gaming consoles); a library like `ua-parser-js` or `bowser` covers far more patterns.
**Complexity:** Low
**Multi-tenant relevance:** No tenant-specific impact, but correctness improvements affect all tenants' security UIs.
**Multi-country relevance:** Device diversity is higher outside North America/Europe (HarmonyOS, Tizen, KaiOS) and the current parser has no coverage for these OS families.

# E-Signature & E-Identity

- **id:** `e_signature`
- **tier:** other
- **version:** 0.1.0
- **dir:** `modules/e_signature/`
- **tags:** auth, identity, signature, eidas
- **icon:** `fas fa-id-card`
- **hasNextLayer:** true

Multi-country e-identity login + e-signature (eIDAS/OIDC4IDA). Pluggable providers (TR Mobil İmza, Smart-ID, BankID, itsme, FranceConnect, eIDAS-nPA, Signicat).

## Dependencies

- **requires:** `db`, `env`, `user`, `user_session`, `user_security`, `redis`, `redis_idempotency`, `limiter`, `audit_log`, `logger`
- **optional:** `storage`, `tenant_setting`

## Services

- `e_signature.cert.service.ts`
- `e_signature.compliance.service.ts`
- `e_signature.crypto.service.ts`
- `e_signature.document.service.ts`
- `e_signature.encryption.service.ts`
- `e_signature.etsi_tsl.service.ts`
- `e_signature.identity.service.ts`
- `e_signature.ocsp.service.ts`
- `e_signature.provider.service.ts`
- `e_signature.service.ts`
- `e_signature.settings.service.ts`
- `e_signature.trust_list.service.ts`
- `e_signature.workflow.service.ts`

## DTOs

- `e_signature.dto.ts`

## Entities

- `signing_certificate.entity.ts`
- `trust_list_entry.entity.ts`

## Enums

- `e_signature.enums.ts`

## Message keys

- `e_signature.messages.ts`

## Setting keys

- `e_signature.setting.keys.ts`

## Owned API routes

- `tenant` GET/PUT `/tenant/[tenantId]/api/e-signature/settings`

## TypeORM entities

- `SigningCertificate` (system) — `modules/e_signature/entities/signing_certificate.entity.ts`
- `TrustListEntry` (system) — `modules/e_signature/entities/trust_list_entry.entity.ts`

## Next layer (modules_next/) surface

- `e_signature/ui/SigningCertificatesBindModal` _(ui, client)_
- `e_signature/ui/SigningCertificatesPanel` _(ui, client)_
- `e_signature/ui/TenantESignatureSettingsPanel` _(ui, client)_

## README

# E Signature Module

Multi-country e-identity login and e-signature on a single, pluggable architecture: country-routed providers, a server-issued challenge/poll flow, certificate-chain + OCSP validation against an ingested trust list, OIDC4IDA-shaped identity claims, and eIDAS LoA awareness. Identity login is live; document signing (PAdES/CAdES/XAdES/JAdES) is scaffolded for v2.

---

## Status

| Capability | State |
|---|---|
| Login via Turkey Mobile Signature aggregator | **Live** — `MobilImzaAggregatorProvider` (real HTTP) |
| Login via Smart-ID (Estonia, Latvia, Lithuania) | **Live** — SK REST API v2 (`SmartIdProvider`) |
| Login via BankID (Sweden) | **Adapter wired**, real `/auth` + `/collect` HTTP deferred — `isConfigured()` keys off env presence |
| Login via Login.gov (United States) | **Adapter wired** — bridges to the OIDC flow handled by `auth_sso`; surfaces in the country picker once configured |
| Tenant admin E-Signature settings page | **Live** — `/tenant/[tenantId]/admin/settings/e-signature` (per-workspace Mobil Imza credentials, encrypted) |
| Envelope encryption for sensitive settings (AES-256-GCM) | **Live** — `ESignatureEncryptionService`; admin reads return a `***SET***` mask |
| OCSP revocation check (pkijs request build + POST + responder-signature verify) | **Live** — `ESignatureOCSPService.check` |
| Chain validation against the trust list | **Live** — country-aware lookup, returns the matched issuer for OCSP |
| ETSI EU LOTL ingestion (LOTL → per-country TSL → trust roots) | **Live** — `ESignatureETSI_TSLService`, with XAdES verify when `LOTL_SIGNER_CERT_PEM` is set |
| Turkey KamuSM trust-root bundle | **Live** — reads the PEM bundle from `TR_TRUST_ROOTS_PATH` |
| Tenant webhook dispatch (`identity.verified` / `document.signed`) | **Live** — only for tenant-scoped transactions |
| Document signing (PAdES / CAdES / XAdES / JAdES) | Interface ready; base provider hooks throw `NotImplementedError` |

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `SigningCertificate` | `signing_certificates` | A user-bound signing/auth certificate. Pinned by `certFingerprintSha256` (unique); stores issuer/subject DN, serial, LoA, validity window, salted `nationalIdHash`, `lastUsedAt`/`revokedAt`. |
| `TrustListEntry` | `trust_list_entries` | A trust-anchor (CA root) certificate keyed by `(country, subjectKeyIdentifier)`. Stores the PEM, issuer DN, validity window, and `source` (`etsi_lotl` \| `tr_kamusm` \| `manual`). |

Both entities live in the **system DB** — neither carries a `tenantId`. Signing certificates are bound to a user; trust-list anchors are global CA roots. See `e_signature.seed.ts`.

---

## Services / Responsibilities

| Service | Responsibility |
|---|---|
| `ESignatureService` (`e_signature.service.ts`) | Facade. Provider registry (country-aware, capability-flagged), `listCountryHints` / `listProvidersAdmin`, `initiateLogin` (server-issued challenge → Redis transaction record, TTL 120s), `pollStatus` (verify signature → chain → OCSP → key-usage + LoA → normalize claims → user match → single-use delete → tenant webhook dispatch). Resolves per-tenant aggregator credentials. |
| `ESignatureCryptoService` (`e_signature.crypto.service.ts`) | Pure crypto: certificate parsing (`@peculiar/x509`), challenge-signature verification, validity-window + key-usage (`nonRepudiation`) policy, chain validation up to a trust anchor, SKI/AKI/EKU helpers, and the OCSP entry point (`checkRevocationOCSP`). |
| `ESignatureOCSPService` (`e_signature.ocsp.service.ts`) | Builds an OCSP request (`pkijs`/`asn1js`), POSTs to the AIA responder, and verifies the responder signature via `BasicOCSPResponse.verify({ trustedCerts })`. Soft-fails to `unknown` on transport errors. |
| `ESignatureTrustListService` (`e_signature.trust_list.service.ts`) | Trust-list read (Redis-cached per country) + ingestion (`ingestEtsiLOTL`, `ingestTrKamuSm`, `ingestAll`). Persists `TrustListEntry` rows; cache invalidation via `clearCache`. |
| `ESignatureETSI_TSLService` (`e_signature.etsi_tsl.service.ts`) | Fetches + parses ETSI EU LOTL / per-country TSL XML and performs XAdES enveloped-signature verification (LOTL against `LOTL_SIGNER_CERT_PEM`; each TSL against the LOTL-declared signing certs). |
| `ESignatureCertService` (`e_signature.cert.service.ts`) | Bound-certificate CRUD: `findByFingerprint`, `findByUser`, `bind` (refuses cross-user fingerprint reuse), `markUsed`, `revoke`, and salted national-id hashing (`sha256("${country}:${plaintext}")`). |
| `ESignatureIdentityService` (`e_signature.identity.service.ts`) | Normalizes provider-specific `RawIdentityClaims` into an OIDC4IDA `verified_claims`-shaped `VerifiedIdentity`. The plaintext national id never leaves this service unhashed. |
| `ESignatureEncryptionService` (`e_signature.encryption.service.ts`) | AES-256-GCM envelope encryption for sensitive setting values. Wire format `v1.{iv}.{ciphertext}.{authTag}` (base64url); key from `SETTINGS_ENCRYPTION_KEY` (64-hex). |
| `ESignatureSettingsService` (`e_signature.settings.service.ts`) | System + tenant settings access. Encrypts sensitive values on write, decrypts for internal callers, and masks them as `***SET***` in admin views. Tenant reads fall back field-by-field to the system value. |

---

## Provider model

```ts
abstract class BaseESignatureProvider {
  abstract name: string;
  abstract displayName: string;
  abstract supportedCountries: readonly CountryCode[];   // ISO 3166-1 alpha-2
  abstract capabilities: readonly ProviderCapability[];   // 'login' | 'sign_pades' | 'sign_cades' | 'sign_xades' | 'sign_jades'
  abstract defaultLoA: LoA;                               // 'low' | 'substantial' | 'high'
  abstract identifierLabel: string;
  abstract identifierPlaceholder?: string;

  isConfigured(): boolean;                                // defaults false — concrete providers override
  abstract validateIdentifier(identifier: string, country?: CountryCode): { ok: boolean; normalized?: string; error?: string };
  abstract initiateLogin(input: InitiateLoginInput): Promise<InitiateLoginOutput>;
  abstract pollLoginResult(providerTxnId: string, credentials?: ProviderCredentials): Promise<PollResult>;

  // v2 hooks (base class throws NotImplementedError)
  initiateDocumentSign(input: SignDocumentInput): Promise<SignDocumentOutput>;
  pollDocumentSignResult(providerTxnId: string): Promise<SignDocumentResult>;

  abstract extractClaims(certificate: Buffer, providerClaims?: unknown): RawIdentityClaims;
}
```

Every provider is registered up-front in `ESignatureService.PROVIDERS`. Whether each one surfaces to end users is decided per-call by `isConfigured()`, so unconfigured adapters never appear on the login picker but remain visible in the admin overview (`listProvidersAdmin`). Country → provider routing follows the `notification_sms` pattern:

```
EID_PROVIDER_MAP=TR:mobil_imza_aggregator,EE:smart_id,SE:bankid_se
EID_DEFAULT_PROVIDER=mobil_imza_aggregator
```

### Provider matrix

| Country | Provider | LoA | Capabilities | Configuration |
|---|---|---|---|---|
| TR | Mobil Imza aggregator | high | login | `MOBIL_IMZA_AGGREGATOR_*` env / system + tenant settings |
| EE, LV, LT | Smart-ID (SK REST API) | high | login | `SMART_ID_*` env |
| SE | BankID Sweden | high | login, sign_xades | `BANKID_SE_*` env (mTLS) — adapter shell |
| US | Login.gov (OIDC bridge) | substantial | login | `LOGIN_GOV_*` env; the user flow continues through `auth_sso` OIDC |

Adding a region is a single file under `providers/`: extend `BaseESignatureProvider`, implement `isConfigured()`, `validateIdentifier()`, `initiateLogin()`, `pollLoginResult()`, `extractClaims()`, register it in `ESignatureService.PROVIDERS`, then add a country mapping via `EID_PROVIDER_MAP`. If the provider needs persisted state, add an entity under `entities/` and append it to the data-source's entity array.

---

## API Routes

All routes are tenant-scoped under `/tenant/[tenantId]/...`. The login routes are public (rate-limited by `Limiter`, scoped to the initiating IP + UA); the settings routes require tenant membership.

| Method | Path | Scope / Auth | Description |
|---|---|---|---|
| GET | `/tenant/[tenantId]/api/auth/e-signature/countries` | public | Country/provider picker hint — only providers reporting `isConfigured()`. |
| POST | `/tenant/[tenantId]/api/auth/e-signature/initiate` | public, `auth` rate limit | Body `{ country, identifier, providerOverride? }`. Generates a server-issued challenge, stores the transaction in Redis (TTL 120s, `purpose='login'`, `tenantId` bound), forwards to the provider. Returns `{ transactionId, expiresIn, displayCode?, providerName }`. Audited. |
| GET | `/tenant/[tenantId]/api/auth/e-signature/status/[transactionId]` | public, `auth` rate limit | Poll. On `signed`: verifies + matches the user → requires active tenant membership → mints a `UserSession` and sets cookies. Unmatched cert → `403 NEEDS_BINDING`. Non-member match → `403 NOT_A_MEMBER`. Audited. |
| GET / PUT | `/tenant/[tenantId]/api/e-signature/settings` | tenant member (GET) / OWNER\|ADMIN (PUT) | Per-tenant E-Signature settings JSON API. Sensitive values come back masked as `***SET***`; the PUT body is `{ settings: {...} }`. Audited. |

> Note: there is no separate `bind` route or root-tenant-scoped route in `app/` today. The service-level `bind` purpose, auto-bind on `signed`, and per-user certificate listing exist in `ESignatureService` / `ESignatureCertService` but are not yet exposed via an HTTP route.

---

## Login flow

1. `GET …/countries` → returns the picker hint:
   ```json
   [
     { "country": "TR", "providers": [
       { "id": "mobil_imza_aggregator", "name": "Mobil İmza",
         "identifierLabel": "Mobile number (Turkey)",
         "identifierPlaceholder": "+90 5XX XXX XX XX",
         "capabilities": ["login"], "loa": "high" }
     ]}
   ]
   ```
2. `POST …/initiate` with `{ country, identifier, providerOverride? }` — server generates a single-use challenge, stores the transaction in Redis (TTL 120s), forwards it to the provider, and returns `{ transactionId, expiresIn, displayCode? }`.
3. `GET …/status/:transactionId` (poll ~every 2s, up to 180s):
   - On `signed`: verify signature → validate cert chain (country-aware trust list) → OCSP check → enforce key-usage (`nonRepudiation`) + LoA → normalize claims (OIDC4IDA) → match user → mint `UserSession` + cookies.
   - On unmatched cert: `403 NEEDS_BINDING`.
   - Tenant-scoped transactions dispatch `identity.verified` (and `document.signed` for a `sign` purpose) to the tenant's webhooks.

---

## OIDC4IDA `verified_claims` shape

```ts
{
  given_name: string | null,
  family_name: string | null,
  birth_date: string | null,
  national_id: { country: 'TR' | …, value_hash: string } | null, // salted SHA-256
  country: 'TR' | …,
  loa: 'low' | 'substantial' | 'high',
  provider: string,
  evidence: {
    type: 'electronic_signature',
    issuer_dn: string,
    serial: string,
    fingerprint_sha256: string,
    not_before: string,
    not_after: string,
  },
}
```

The plaintext national identifier is **never** persisted — only a salted SHA-256 (`sha256("${country}:${plaintext}")`) is stored on the bound certificate row.

---

## Settings

System keys live at the root tenant; a subset is overridable per tenant. Sensitive values are envelope-encrypted (`SETTINGS_ENCRYPTION_KEY`) and masked as `***SET***` in admin views. Read/written via `ESignatureSettingsService`; the per-tenant subset is surfaced at `/tenant/[tenantId]/admin/settings/e-signature` and the `GET/PUT …/api/e-signature/settings` route.

| Key | Sensitive | System | Tenant | Notes |
|---|---|---|---|---|
| `eidEnabled` | — | yes | yes | Declared toggle for e-ID/e-signature login (not read at runtime today). |
| `eidDefaultProvider` | — | yes | — | Fallback provider name. Runtime value comes from `env.EID_DEFAULT_PROVIDER`. |
| `eidProviderMap` | — | yes | — | Country→provider routing. Runtime value comes from `env.EID_PROVIDER_MAP`. |
| `eidRequiredLoA` | — | yes | yes | Minimum LoA (`low`\|`substantial`\|`high`). `pollStatus` enforces `env.EID_REQUIRED_LOA` today. |
| `mobilImzaAggregatorEnabled` | — | yes | — | System master toggle for the Mobil Imza aggregator provider. |
| `mobilImzaAggregatorBaseUrl` | — | yes | — | Mobil Imza aggregator REST base URL. |
| `mobilImzaAggregatorApiKey` | **yes** | yes | yes | Aggregator Bearer credential (envelope-encrypted). Per-tenant value overrides the system value. |
| `mobilImzaAggregatorCustomerCode` | — | yes | yes | Aggregator customer code (`X-Customer-Code`). Per-tenant override with system fallback. |
| `mobilImzaCallbackHmacSecret` | **yes** | yes | — | HMAC secret for verifying aggregator callback signatures. |
| `trTrustRootsPath` | — | yes | — | Path to the TR KamuSM PEM bundle ingested into the trust list. |
| `euLotlUrl` | — | yes | — | EU List of Trusted Lists URL ingested into the trust list. |
| `tsaDefaultUrl` | — | yes | — | Default Timestamping Authority URL for PAdES timestamping (v2). |

### Environment variables

| Var | Purpose |
|---|---|
| `EID_DEFAULT_PROVIDER` | Fallback when country lookup misses |
| `EID_PROVIDER_MAP` | `"COUNTRY:provider,COUNTRY:provider,…"` |
| `EID_REQUIRED_LOA` | `low` / `substantial` / `high` — server-side LoA gate |
| `EU_LOTL_URL` | ETSI EU LOTL XML location (defaults to `ec.europa.eu/tools/lotl/eu-lotl.xml`) |
| `LOTL_SIGNER_CERT_PEM` | Out-of-band-distributed LOTL distribution-point certificate (PEM). When set, LOTL XAdES signature is verified before ingestion. |
| `TR_TRUST_ROOTS_PATH` | PEM bundle of TR KamuSM roots |
| `TSA_DEFAULT_URL` | RFC 3161 TSA endpoint (future document signing) |
| `MOBIL_IMZA_AGGREGATOR_BASE_URL` / `_API_KEY` / `_CUSTOMER_CODE` | Turkey aggregator base URL / Bearer token (**sensitive**) / customer code |
| `MOBIL_IMZA_CALLBACK_HMAC_SECRET` | Asynchronous aggregator callbacks |
| `SMART_ID_BASE_URL` / `_RELYING_PARTY_UUID` / `_RELYING_PARTY_NAME` | Smart-ID RP API base URL + RP UUID/name from SK ID Solutions |
| `BANKID_SE_BASE_URL` / `_CLIENT_CERT_PATH` / `_CLIENT_KEY_PATH` | Swedish BankID RP API base URL + mTLS client cert/key paths |
| `LOGIN_GOV_CLIENT_ID` / `_REDIRECT_URI` | Login.gov (US) OIDC client id + redirect URI (flow continues through `auth_sso`) |
| `SETTINGS_ENCRYPTION_KEY` | 64-hex (32 bytes) AES-256-GCM key for envelope-encrypted settings |

---

## Security

| Risk | Mitigation |
|---|---|
| Replay (same signature used twice) | Server-generated nonce; single-use Redis record (TTL 120s) deleted on first success |
| Client-supplied "to be signed" data | The challenge is always built on the server — the client only sees `transactionId` |
| Certificate forgery | Country-aware chain validation via TR roots + ETSI LOTL; key usage `nonRepudiation` enforced |
| Wrong-person bind (impersonation) | Fingerprint pinning on `signing_certificates`; `bind` refuses cross-user fingerprint reuse |
| PIN exfiltration (Mobile signature) | The PIN never reaches the backend — only the operator / aggregator |
| Aggregator callback spoofing | HMAC secret (`mobilImzaCallbackHmacSecret`, envelope-encrypted) |
| SMS/MNO abuse cost | Rate limit (`Limiter.checkRateLimit(request, 'auth')`) |
| Plaintext credentials at rest | Envelope encryption (AES-256-GCM) via `SETTINGS_ENCRYPTION_KEY`; admin reads masked as `***SET***` |
| Session fixation | `transactionId` is bound to the initiating IP + UA; mismatch → error |
| Tenant IDOR | `transactionId` is held in Redis only, not cross-tenant addressable; `signed` login requires active tenant membership |
| Certificate revocation | OCSP check with responder-signature verification; fail-closed on `revoked`, soft-fail on `unknown` |
| Missing audit trail | Every initiate + result + settings update writes to `audit_log` |

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A qualified-electronic-signature / eIDAS identity-verification module (provider registry, challenge/poll flow, certificate-chain + OCSP validation, trust-list ingestion) whose data is system-scoped but which supports per-tenant override of the Turkish Mobil Imza aggregator credentials, with eidEnabled/eidRequiredLoA also declared tenant-overridable though not yet consumed at runtime.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `mobilImzaAggregatorApiKey` | string | — | tenant | Per-tenant API key (envelope-encrypted) for the Turkish Mobil Imza aggregator; falls back to the system-level value when unset. Read at request time and injected as the provider's Bearer credential. | `e_signature.settings.service.ts` |
| `mobilImzaAggregatorCustomerCode` | string | — | tenant | Per-tenant aggregator customer code (X-Customer-Code header) for Mobil Imza; falls back to the system-level value. Lets each tenant carry its own aggregator account. | `e_signature.settings.service.ts` |
| `eidEnabled` | boolean | — | tenant | Declared as a per-tenant override and surfaced in the tenant admin view/update, intended to toggle e-ID/e-signature login for the tenant. NOTE: the service never reads it at runtime today, so the override is inert (see candidates). | `e_signature.settings.service.ts` |
| `eidRequiredLoA` | string | — | tenant | Declared as a per-tenant override of the minimum required Level of Assurance (low\|substantial\|high) and surfaced in the tenant admin view/update. NOTE: pollStatus reads env.EID_REQUIRED_LOA instead, so the tenant override is currently ignored (see candidates). | `e_signature.settings.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Per-tenant behavior

- `e_signature.service.ts:resolveTenantCredentials` — When a transaction carries a tenantId, the Mobil Imza aggregator API key and customer code are resolved per-tenant (via ESignatureSettingsService.getTenantInternal) with field-by-field fallback to system config, so each tenant can authenticate against its own aggregator account.
- `e_signature.service.ts:initiateLogin` — Passes per-tenant resolved ProviderCredentials into provider.initiateLogin only when params.tenantId is set; the MobilImzaAggregatorProvider then builds a tenant-specific axios client (tenant Bearer key / X-Customer-Code) instead of the env-default one.
- `e_signature.service.ts:pollStatus` — Re-resolves per-tenant credentials from record.tenantId for polling, and only for tenant-scoped transactions dispatches the identity.verified / document.signed webhooks to that tenant (WebhookService.dispatchEvent(record.tenantId, ...)); system/root transactions emit no webhooks.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Minimum required Level of Assurance is read from a global env var, ignoring the per-tenant eidRequiredLoA setting that the tenant admin UI already writes. | `e_signature.service.ts:pollStatus (const requiredLoA = env.EID_REQUIRED_LOA)` | eidRequiredLoA is declared in E_SIGNATURE_TENANT_KEYS and exposed via getTenantAdminView/updateTenantAdmin, but pollStatus enforces env.EID_REQUIRED_LOA, so a tenant raising its assurance bar has no effect. Should read the tenant value (with system fallback) so LoA policy can vary per tenant. | `eidRequiredLoA` |
| Whether e-ID / e-signature login is enabled is never gated per tenant despite an eidEnabled tenant override existing. | `e_signature.service.ts:initiateLogin / resolveProvider` | eidEnabled is declared tenant-overridable and surfaced in the tenant admin view, but no code path checks it; the provider picker is gated only by env-driven provider configuration. A tenant cannot actually turn the feature on/off. Should consult the tenant eidEnabled value before initiating. | `eidEnabled` |
| Default provider name is a global env-derived constant. | `e_signature.service.ts:DEFAULT_PROVIDER_NAME (env.EID_DEFAULT_PROVIDER \|\| 'mobil_imza_aggregator')` | Computed once at class-load from env and shared by all tenants; eidDefaultProvider exists as a setting key but is never read. Tenants serving different regions cannot pick a different default provider. Should resolve per-tenant with system fallback. | `eidDefaultProvider` |
| Country-to-provider routing map is a global env-derived constant. | `e_signature.service.ts:buildCountryMap / COUNTRY_MAP (env.EID_PROVIDER_MAP)` | Built once from env.EID_PROVIDER_MAP and shared across all tenants; eidProviderMap exists as a setting key but is never read. A tenant cannot route a given country to a different provider. Should resolve the map per-tenant with system fallback. | `eidProviderMap` |
| Aggregator base URL is not part of the tenant override set even though apiKey/customerCode are. | `mobil_imza_aggregator.provider.ts:buildHttp (creds?.baseUrl ?? env.MOBIL_IMZA_AGGREGATOR_BASE_URL)` | ProviderCredentials supports a per-tenant baseUrl and the provider honors it, but resolveTenantCredentials never populates it and mobilImzaAggregatorBaseUrl is system-only, so a tenant on a different aggregator endpoint cannot be served. Adding a tenant baseUrl key would complete the per-tenant aggregator account story. | `mobilImzaAggregatorBaseUrl` |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `eidDefaultProvider` — Platform-wide default provider name; today the runtime value comes from env.EID_DEFAULT_PROVIDER, not this key.
- `eidProviderMap` — Platform-wide country->provider routing map; today the runtime value comes from env.EID_PROVIDER_MAP, not this key.
- `mobilImzaAggregatorEnabled` — System-level master toggle for the Mobil Imza aggregator provider.
- `mobilImzaAggregatorBaseUrl` — System-level base URL for the Mobil Imza aggregator API (default override target; tenants do not set their own base URL via the tenant key set).
- `mobilImzaCallbackHmacSecret` — System-level (envelope-encrypted) HMAC secret used to verify aggregator callback signatures.
- `trTrustRootsPath` — System path to the TR KamuSM PEM bundle ingested into the global trust list (read via env.TR_TRUST_ROOTS_PATH in trust_list.service).
- `euLotlUrl` — System URL of the EU List of Trusted Lists ingested into the global trust list (read via env.EU_LOTL_URL in trust_list.service).
- `tsaDefaultUrl` — System-level default Timestamping Authority URL for PAdES timestamping (document-signing v2).

---

## Standards & compliance targets

- **eIDAS Regulation (EU 910/2014)** — LoA semantics, QES equivalence
- **OIDC4IDA** — identity normalization
- **ETSI EN 319 412 / 319 422** — certificate profile validation
- **ETSI EN 319 142 (PAdES) / 319 122 (CAdES) / 319 132 (XAdES) / 319 182 (JAdES)** — v2 document signing
- **RFC 3161** — TSA timestamping
- **RFC 6960 / 5280** — OCSP / X.509 path validation
- **ISO 3166-1 alpha-2** — country codes

---

## Dependencies

Requires: `db`, `env`, `user`, `user_session`, `user_security`, `redis`, `redis_idempotency`, `limiter`, `audit_log`, `logger`. Optional: `storage`, `tenant_setting`. Tenant webhooks dispatch through `webhook` (`identity.verified` / `document.signed`).

npm packages: `@peculiar/x509` (X.509 parsing + path validation), `pkijs` + `asn1js` (OCSP), `fast-xml-parser` + `@xmldom/xmldom` + `xml-crypto` (ETSI LOTL/TSL parsing + XAdES verify), `google-libphonenumber` (E.164 normalization), `@signpdf/signpdf` (v2 — PAdES signing).

```bash
npm i @peculiar/x509 pkijs asn1js fast-xml-parser @xmldom/xmldom xml-crypto
```

---

## Roadmap

- **v1.x** — Expose `bind` / per-user certificate management via HTTP routes; per-tenant credentials for Smart-ID/BankID/Login.gov; consume `eidEnabled` / `eidRequiredLoA` / `eidDefaultProvider` / `eidProviderMap` per tenant (see *Tenant Variability → Candidates*).
- **v2** — Document signing (PAdES B-LTA priority), TSA integration, signed-PDF storage via `modules/storage`. Complete BankID Sweden `/auth` + `/collect` HTTP integration.
- **v3+** — Additional providers: itsme (BE), FranceConnect (FR), eIDAS-nPA (DE), SPID/CIE (IT), DigiD (NL), Signicat multi-EU aggregator.

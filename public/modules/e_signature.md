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
- `e_signature.crypto.service.ts`
- `e_signature.encryption.service.ts`
- `e_signature.etsi_tsl.service.ts`
- `e_signature.identity.service.ts`
- `e_signature.ocsp.service.ts`
- `e_signature.service.ts`
- `e_signature.settings.service.ts`
- `e_signature.trust_list.service.ts`

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

- `e_signature/ui/SigningCertificatesPanel` _(ui, client)_
- `e_signature/ui/TenantESignatureSettingsPanel` _(ui, client)_

## README

# `e_signature` — Multi-country e-identity & e-signature

Pluggable trust-services module: e-identity login (today) and e-signature
(scaffolded for v2). Single architecture, country-routed providers,
OIDC4IDA-shaped identity claims, eIDAS LoA awareness.

## Status

| Capability | State |
|---|---|
| Login via Turkey Mobile Signature aggregator | **Live** — Mobil Imza adapter |
| Login via Smart-ID (Estonia, Latvia, Lithuania) | **Live** — real SK REST API integration (`SmartIdProvider`) |
| Login via BankID (Sweden) | **Adapter wired**, real `/auth` + `/collect` HTTP calls deferred — provider gate (`isConfigured`) keys off env presence |
| Login via Login.gov (United States) | **Adapter wired** — bridges to OIDC flow handled by `auth_sso`; surfaces in country picker once configured |
| Tenant admin E-Signature settings page (`/tenant/[id]/admin/settings` → E-Signature tab) | **Live** — per-workspace policy + Mobil Imza credentials (encrypted) |
| Account-settings bind/revoke UI (OTP-gated) | **Live** — `SigningCertificatesPanel` |
| Super-admin (root tenant ADMIN) settings UI (`/tenant/00000000-0000-4000-8000-000000000000/admin/settings` → E-Signature tab) with provider matrix | **Live** |
| Envelope encryption for sensitive admin settings (AES-256-GCM) | **Live** — `ESignatureEncryptionService`; admin GET returns `***SET***` mask |
| OCSP revocation check (pkijs request build + POST) | **Live** — `ESignatureOCSPService.check` |
| OCSP responder signature verification | **Live** — `BasicOCSPResponse.verify({ trustedCerts })` against the issuer |
| Chain validation against trust list | **Live** — country-aware lookup, returns matched issuer for OCSP |
| ETSI EU LOTL ingestion (LOTL → per-country TSL → trust roots) | **Live** — `ESignatureETSI_TSLService`, with XAdES enveloped signature verify when `LOTL_SIGNER_CERT_PEM` is set |
| Tenant-scope routes (`/tenant/[tenantId]/api/auth/e-signature/*`) + tenant-admin settings | **Live** |
| Turkey KamuSM trust-root bundle | Implemented (reads PEM bundle from `TR_TRUST_ROOTS_PATH`) |
| Document signing (PAdES / CAdES / XAdES / JAdES) | Interface ready, providers throw `NotImplementedError` |

## Architecture

```
modules/e_signature/
├── module.json
├── README.md
├── index.ts
├── e_signature.{enums,types,dto,messages,constants,setting.keys}.ts
├── e_signature.service.ts             # facade: resolveProvider, initiateLogin, pollStatus
├── e_signature.crypto.service.ts      # cert parsing, signature verify, chain validation, OCSP
├── e_signature.cert.service.ts        # bound-cert CRUD (per-user pinning)
├── e_signature.trust_list.service.ts  # ETSI LOTL + TR KamuSM ingestion
├── e_signature.etsi_tsl.service.ts    # ETSI LOTL/TSL XML parser + XAdES verify
├── e_signature.ocsp.service.ts        # OCSP request build + BasicOCSPResponse verify
├── e_signature.encryption.service.ts  # AES-256-GCM envelope for sensitive settings
├── e_signature.settings.service.ts    # system + tenant settings access with encrypt/mask
├── e_signature.identity.service.ts    # provider claims → OIDC4IDA verified_claims
├── entities/
│   ├── signing_certificate.entity.ts  (SYSTEM schema — user-bound)
│   └── trust_list_entry.entity.ts     (SYSTEM schema)
└── providers/
    ├── base.provider.ts                       (abstract, capability-flagged, isConfigured)
    ├── mobil_imza_aggregator.provider.ts      (TR — real HTTP)
    ├── smart_id.provider.ts                   (EE/LV/LT — real SK REST API)
    ├── bankid_se.provider.ts                  (SE — adapter shell, mTLS HTTP TODO)
    └── login_gov.provider.ts                  (US — OIDC bridge via auth_sso)
```

## Login flow

1. `GET /tenant/00000000-0000-4000-8000-000000000000/api/auth/e-signature/countries` → returns the picker hint:
   ```json
   [
     { "country": "TR", "providers": [
       { "id": "mobil_imza_aggregator", "name": "Mobil İmza",
         "identifierLabel": "Mobile number (Türkiye)",
         "identifierPlaceholder": "+90 5XX XXX XX XX",
         "capabilities": ["login"], "loa": "high" }
     ]}
   ]
   ```
2. `POST /tenant/00000000-0000-4000-8000-000000000000/api/auth/e-signature/initiate` body `{ country, identifier, providerOverride? }`
   - Server generates a single-use challenge, stores `{provider, country, identifier, challenge, ip, ua, …}` in Redis (TTL 120 s), forwards to the aggregator.
   - Returns `{ transactionId, expiresIn, displayCode? }`.
3. `GET /tenant/00000000-0000-4000-8000-000000000000/api/auth/e-signature/status/:transactionId` (poll every 2 s, up to 180 s):
   - On `signed`: verifies signature → validates cert chain (country-aware trust list) → checks OCSP → enforces key-usage + LoA → normalizes claims (OIDC4IDA) → matches user → mints `UserSession` + cookies.
   - On unmatched cert: `403 NEEDS_BINDING`.
4. `POST /tenant/00000000-0000-4000-8000-000000000000/api/auth/e-signature/bind` (authenticated, 2FA-gated): identical initiate flow with `purpose='bind'`, auto-persists the certificate via `SigningCertificate` on signed.

## Provider model

```ts
abstract class BaseESignatureProvider {
  abstract name: string;
  abstract supportedCountries: readonly CountryCode[];   // ISO 3166-1 alpha-2
  abstract capabilities: readonly ProviderCapability[];   // 'login' | 'sign_pades' | 'sign_cades' | 'sign_xades' | 'sign_jades'
  abstract defaultLoA: LoA;                               // 'low' | 'substantial' | 'high'

  abstract validateIdentifier(identifier: string, country?: CountryCode): { ok: boolean; normalized?: string; error?: string };
  abstract initiateLogin(input: { identifier: string; challenge: string }): Promise<{ providerTxnId: string; displayCode?: string }>;
  abstract pollLoginResult(providerTxnId: string): Promise<PollResult>;

  // v2 hooks (base class throws NotImplementedError)
  initiateDocumentSign(input: SignDocumentInput): Promise<SignDocumentOutput>;
  pollDocumentSignResult(providerTxnId: string): Promise<SignDocumentResult>;

  abstract extractClaims(certificate: Buffer, providerClaims?: unknown): RawIdentityClaims;
}
```

Country → provider routing follows the `notification_sms` pattern:

```
EID_PROVIDER_MAP=TR:mobil_imza_aggregator,EE:smart_id,SE:bankid_se
EID_DEFAULT_PROVIDER=mobil_imza_aggregator
```

## Environment variables

| Var | Purpose |
|---|---|
| `EID_DEFAULT_PROVIDER` | Fallback when country lookup misses |
| `EID_PROVIDER_MAP` | `"COUNTRY:provider,COUNTRY:provider,…"` |
| `EID_REQUIRED_LOA` | `low` / `substantial` / `high` — server-side LoA gate |
| `EU_LOTL_URL` | ETSI EU LOTL XML location (defaults to `ec.europa.eu/tools/lotl/eu-lotl.xml`) |
| `LOTL_SIGNER_CERT_PEM` | Out-of-band-distributed LOTL distribution-point certificate (PEM). When set, LOTL XAdES signature is verified before ingestion. |
| `TR_TRUST_ROOTS_PATH` | PEM bundle of TR KamuSM roots |
| `TSA_DEFAULT_URL` | RFC 3161 TSA endpoint (used by future document signing) |
| `MOBIL_IMZA_AGGREGATOR_BASE_URL` | Turkey aggregator REST base URL |
| `MOBIL_IMZA_AGGREGATOR_API_KEY` | Turkey aggregator bearer token; **sensitive** |
| `MOBIL_IMZA_AGGREGATOR_CUSTOMER_CODE` | Turkey aggregator customer identifier |
| `MOBIL_IMZA_CALLBACK_HMAC_SECRET` | For asynchronous aggregator callbacks |
| `SMART_ID_BASE_URL` | Smart-ID RP API base URL (e.g. `https://rp-api.smart-id.com/v2`) |
| `SMART_ID_RELYING_PARTY_UUID` | Smart-ID relying-party UUID issued by SK ID Solutions |
| `SMART_ID_RELYING_PARTY_NAME` | Smart-ID display name shown on the user's device |
| `BANKID_SE_BASE_URL` | Swedish BankID RP API base URL |
| `BANKID_SE_CLIENT_CERT_PATH` | Disk path to the mTLS client certificate (PEM) |
| `BANKID_SE_CLIENT_KEY_PATH` | Disk path to the mTLS client key (PEM) |
| `LOGIN_GOV_CLIENT_ID` | Login.gov (US) OIDC client ID — flow continues through `auth_sso` |
| `LOGIN_GOV_REDIRECT_URI` | Login.gov OIDC redirect URI |
| `SETTINGS_ENCRYPTION_KEY` | 64-hex (32 bytes) AES-256-GCM key for envelope-encrypted tenant settings |

## Security model

| Risk | Mitigation |
|---|---|
| Replay (same signature used twice) | Server-generated nonce; single-use Redis record (`TTL = 120 s`) deleted on first success |
| Client-supplied "to be signed" data | Challenge is always built on the server — the client only sees `transactionId` |
| Certificate forgery | Country-aware chain validation via TR trust roots + ETSI LOTL; key usage `nonRepudiation` enforced |
| Wrong-person bind (impersonation) | Fingerprint pinning on `signing_certificates`; first-time bind requires session + 2FA |
| PIN exfiltration (Mobile signature) | PIN never reaches the backend — only the operator / aggregator |
| Aggregator callback spoofing | HMAC + IP allow-list (`MOBIL_IMZA_CALLBACK_HMAC_SECRET`); v1.1 |
| SMS/MNO abuse cost | Rate-limit (`Limiter.useRateLimit(req, 'auth')`) |
| Plaintext credentials in `tenant_setting` | Envelope encryption via `SETTINGS_ENCRYPTION_KEY` |
| CSRF | `x-csrf-token` enforced as in the rest of the auth surface |
| Session fixation | `transactionId` is bound to the initiating IP + UA; mismatch → 403 |
| Brute force | Mirrors `user_security.failedLoginAttempts` / `lockedUntil` |
| Tenant IDOR | `transactionId` is held in Redis only, not addressable cross-tenant |
| Missing audit trail | Every initiate + result writes to `audit_log` |

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

The plaintext national identifier is **never persisted** — only a salted
SHA-256 (`sha256("${country}:${plaintext}")`) is stored on the bound
certificate row.

## Standards & compliance targets

- **eIDAS Regulation (EU 910/2014)** — LoA semantics, QES equivalence
- **OIDC4IDA** — identity normalization
- **ETSI EN 319 412 / 319 422** — certificate profile validation
- **ETSI EN 319 142 (PAdES) / 319 122 (CAdES) / 319 132 (XAdES) / 319 182 (JAdES)** — v2 document signing
- **RFC 3161** — TSA timestamping
- **RFC 6960 / 5280** — OCSP / X.509 path validation
- **ISO 3166-1 alpha-2** — country codes

## Required npm packages

```
@peculiar/x509           # X.509 parsing + path validation
pkijs                    # OCSP request build + BasicOCSPResponse verify
asn1js                   # peer of pkijs
fast-xml-parser          # ETSI LOTL/TSL parsing
@xmldom/xmldom           # DOM for xml-crypto
xml-crypto               # XAdES enveloped signature verification
google-libphonenumber    # already in the project — E.164 normalization
@signpdf/signpdf         # v2 — PAdES signing
```

Install with:

```bash
npm i @peculiar/x509 pkijs asn1js fast-xml-parser @xmldom/xmldom xml-crypto
```

## Adding a new provider

1. Implement `BaseESignatureProvider` in `providers/<name>.provider.ts`. Use
   `providers/_examples/*.example.ts` as references.
2. Register the instance in the `PROVIDERS` map of
   `e_signature.service.ts`.
3. Add country mappings via `EID_PROVIDER_MAP`.
4. If the provider needs persisted state, add an entity under `entities/`
   and append it to the appropriate data-source's entity array.

## Provider matrix

| Country | Provider | LoA | Capabilities | Configuration |
|---|---|---|---|---|
| TR | Mobil Imza aggregator | high | login | `MOBIL_IMZA_AGGREGATOR_*` env / system settings |
| EE, LV, LT | Smart-ID (SK REST API) | high | login | `SMART_ID_*` env |
| SE | BankID Sweden | high | login, sign_xades | `BANKID_SE_*` env (mTLS) |
| US | Login.gov (OIDC bridge) | substantial | login | `LOGIN_GOV_*` env; user flow goes through `auth_sso` OIDC |

Adding a new region is a single file under `providers/`: extend
`BaseESignatureProvider`, implement `isConfigured()`, `validateIdentifier()`,
`initiateLogin()`, `pollLoginResult()`, `extractClaims()`, then register the
adapter in `e_signature.service.ts:PROVIDERS`.

## Admin & tenant configuration

| UI / endpoint | Audience |
|---|---|
| `/tenant/00000000-0000-4000-8000-000000000000/admin/settings` → "E-Signature" tab | Super-admin (root tenant ADMIN)s — provider matrix + global config + Mobil Imza aggregator creds (envelope-encrypted) |
| `/tenant/[tenantId]/admin/settings` → "E-Signature" tab | Tenant owner/admin — per-workspace policy + per-workspace Mobil Imza credentials |
| `GET/PUT /tenant/00000000-0000-4000-8000-000000000000/api/e-signature/settings` | Super-admin (root tenant ADMIN) JSON API; sensitive values return masked as `***SET***` |
| `GET/PUT /tenant/[tenantId]/api/e-signature/settings` | Tenant owner/admin JSON API (per-tenant override) |
| `GET /tenant/00000000-0000-4000-8000-000000000000/api/auth/me/security/e-signature` + bind dialog | Any authenticated user — list / bind / revoke own signing certificates |
| `/tenant/00000000-0000-4000-8000-000000000000/api/auth/e-signature/*` | Root-tenant-scope login flow |
| `/tenant/[tenantId]/api/auth/e-signature/*` | Tenant-scope login flow (matched user must be an active tenant member) |

## Roadmap

- **v1.2** — Bind UI on the tenant-scope account page (`/tenant/[tenantId]/admin/me`); per-tenant credentials for Smart-ID/BankID/Login.gov in the tenant admin settings page.
- **v2** — Document signing (PAdES B-LTA priority), TSA integration, signed PDF storage via `modules/storage`. Complete BankID Sweden `/auth` + `/collect` HTTP integration.
- **v3+** — Additional providers: itsme (BE), FranceConnect (FR), eIDAS-nPA (DE), SPID/CIE (IT), DigiD (NL), Signicat multi-EU aggregator.

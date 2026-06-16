# Terms & Consent

- **id:** `terms_consent`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/terms_consent/`
- **tags:** platform, legal, agreements, terms, consent, gdpr, kvkk, compliance
- **icon:** `fas fa-file-contract`
- **hasNextLayer:** true

Legal agreements + consent. Versioned, immutable, hash-stamped agreement documents (terms of use, privacy/KVKK, distance-selling, pre-information, refund policy, cookie, custom) with an append-only acceptance ledger. Reusable agreements record version+hash on acceptance; order-specific documents (distance-selling/pre-information) are rendered per order and stored verbatim. Also keeps the cookie-consent banner + per-purpose consent ledger. Checkout integration enforces required agreement acceptance before payment. Data export/erasure stays with tenant_export.

## Dependencies

- **requires:** `db`, `env`, `redis`, `common`, `audit_log`, `setting`

## Services

- `terms_consent.agreements.service.ts`
- `terms_consent.service.ts`

## DTOs

- `terms_consent.agreements.dto.ts`
- `terms_consent.dto.ts`

## Entities

- `agreement.entity.ts`
- `agreement_acceptance.entity.ts`
- `agreement_version.entity.ts`
- `consent_record.entity.ts`

## Enums

- `terms_consent.enums.ts`

## Message keys

- `terms_consent.messages.ts`

## Setting keys

- `terms_consent.setting.keys.ts`

## TypeORM entities

- `Agreement` (system) — `modules/terms_consent/server/entities/agreement.entity.ts`
- `AgreementAcceptance` (system) — `modules/terms_consent/server/entities/agreement_acceptance.entity.ts`
- `AgreementVersion` (system) — `modules/terms_consent/server/entities/agreement_version.entity.ts`
- `ConsentRecord` (system) — `modules/terms_consent/server/entities/consent_record.entity.ts`

## Next layer (modules_next/) surface

- `terms_consent/ui/AcceptanceGate` _(ui, client)_
- `terms_consent/ui/ConsentBanner` _(ui, client)_

## README

# terms_consent

**Legal agreements + consent** for a tenant. Two facets in one module:

1. **Agreements** — versioned, immutable, hash-stamped legal documents (terms of
   use, privacy/KVKK, distance-selling, pre-information, refund policy, cookie,
   custom) with an append-only **acceptance ledger**.
2. **Cookie consent** — the consent banner config + per-purpose consent ledger
   (necessary/functional/analytics/marketing).

Framework-agnostic (`modules/` layer); Next bindings (admin UI, `ConsentBanner`,
`AcceptanceGate`, API routes) live under `app/` and `modules_next/`. Data
export/erasure stays with [`tenant_export`](../tenant_export/).

## "Do we store the accepted document verbatim?" — yes, hybrid

To prove *exactly* what a user agreed to (TR Mesafeli Sözleşmeler Yönetmeliği,
KVKK, GDPR), the strategy is:

- **Reusable agreements** (terms, privacy): each `AgreementVersion` is frozen +
  SHA-256 hashed on publish. An acceptance stores `versionId` + `contentHash` —
  the text isn't duplicated per acceptance, but the hash proves integrity and the
  immutable version reproduces the exact text.
- **Order-specific agreements** (distance-selling, pre-information): rendered per
  order from a `{{placeholder}}` template + order/seller data, then stored
  **verbatim** in `AgreementAcceptance.contentSnapshot` (+ its hash), bound to the
  `orderRef`. There is no reusable version for these — the document is unique to
  the order.

Either way `contentHash` is tamper-evidence and the exact accepted text is
recoverable.

## Entities

| Entity | Table | Notes |
|---|---|---|
| `Agreement` | `agreements` | Definition: type, key (unique per tenant), title, requiresAcceptance. |
| `AgreementVersion` | `agreement_versions` | Immutable once published; `content` (+ template), `contentHash`, `isCurrent`. |
| `AgreementAcceptance` | `agreement_acceptances` | Append-only ledger; versionId+hash (reusable) or contentSnapshot+hash+orderRef (order-specific). |
| `ConsentRecord` | `consent_records` | Cookie/purpose consent ledger. |

## Public API

```ts
import { AgreementService, TermsConsentService } from "@/modules/terms_consent";

// Author & publish a reusable agreement
const a = await AgreementService.create(tenantId, { type: "terms_of_use", key: "terms", title: "Terms of Use" }, actorId);
const v = await AgreementService.createVersion(tenantId, a.agreementId, { content: "…" }, actorId);
await AgreementService.publishVersion(tenantId, a.agreementId, v.versionId, actorId);

// Accept the current version (e.g. at signup)
await AgreementService.accept(tenantId, { type: "terms_of_use", subject: { userId } }, meta);

// Checkout (order-specific, verbatim)
const docs = await AgreementService.renderCheckoutAgreements(tenantId, order); // render for display
await AgreementService.acceptCheckoutAgreements(tenantId, { order, subject: { userId } }, meta);
await AgreementService.assertCheckoutAgreementsAccepted(tenantId, order.orderRef, { userId }); // gate before payment

// Cookie consent (unchanged facet)
await TermsConsentService.recordMany(tenantId, decisions, { anonymousId }, meta);
```

Pure helpers: `sha256Hex`, `interpolate`, `renderOrderTemplate`, `buildOrderVars`,
`deriveConsentState`.

## Order-specific templates

Distance-selling / pre-information version `content` is a template. Available
placeholders: `{{order.ref}}`, `{{order.date}}`, `{{order.total}}`,
`{{order.currency}}`, `{{order.items}}`, `{{buyer.name|email|phone|address}}`,
`{{seller.name|address|taxOffice|taxId|mersis|email|phone}}`. Seller identity is
read from settings (`legalSeller*`).

## Settings

Cookie banner: `consentBannerEnabled`, `consentPolicyVersion`,
`consentBannerTitle`, `consentBannerMessage`, `consentPurposes`.
Checkout/legal: `checkoutRequiredAgreements` (JSON array of types), `legalSeller*`.

## Checkout integration

`payment.checkout.operations.createCheckoutSession` calls
`AgreementService.assertCheckoutAgreementsAccepted` whenever the checkout carries
`metadata.orderRef` — so a payment can't proceed unless the order's required
agreements were accepted. No `orderRef` or no required types → no-op.

## HTTP surface

- `GET/POST /tenant/{id}/api/agreements` · `GET/PATCH /tenant/{id}/api/agreements/{agreementId}` (admin)
- `GET/POST /tenant/{id}/api/agreements/{agreementId}/versions` · `POST …/versions/{versionId}/publish` (admin)
- `POST /tenant/{id}/api/agreements/accept` (public) · `GET /tenant/{id}/api/agreements/acceptances` (admin)
- `POST /tenant/{id}/api/checkout/agreements` (render) · `POST /tenant/{id}/api/checkout/agreements/accept`
- Cookie consent: `GET/POST /tenant/{id}/api/consent`, `GET/PATCH /tenant/{id}/api/consent/config`, `GET /tenant/{id}/api/consent/records`

Admin UI: `/tenant/{id}/admin/terms` (agreements), `/tenant/{id}/admin/consent` (cookie banner).

## Dependencies

`db`, `env`, `redis`, `common`, `audit_log`, `setting`.

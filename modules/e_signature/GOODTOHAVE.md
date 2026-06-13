# Good to Have — E-Signature & E-Identity

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## ✅ Generic Document Signing (reusable across modules) ★ Implemented

`ESignatureDocumentService` (`e_signature.document.service.ts`) provides
platform-wide **document signing**, distinct from the mobile identity-challenge
workflow. It produces a **real enveloped XAdES-BES / XML-DSig** signature via
`xml-crypto` (RSA-SHA256, exclusive C14N, X.509 cert embedded in `KeyInfo`).
Signing material (private key + certificate PEM) is supplied either inline
(`signXmlWithKeys`) or by naming two encrypted setting keys
(`signXml` / `signXmlIfConfigured` with `{ keyKey, certKey }`). Exposed on the
`ESignatureService` facade as `signDocumentXml*`. First consumer: the `invoice`
module (FatturaPA / Chorus Pro / ZUGFeRD), but it is intentionally generic so any
module (contracts, archived records, e-gov submissions) can reuse it.
**Remaining:** XAdES qualifying properties (signing time, cert digest, signature
policy) and a PAdES path for PDF signing.

## Legal Compliance per Jurisdiction

### eIDAS QES (Qualified Electronic Signature) Enforcement Mode
**Why:** The module validates Level of Assurance but has no enforceable "QES-only" mode that rejects AdES/Advanced signatures for document signing workflows that legally require a Qualified Electronic Signature under eIDAS Regulation (EU 910/2014), such as EU public procurement contracts.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant operating as a legal SaaS in the EU needs to be able to configure which workflows require QES vs. AdES vs. simple electronic signature, and this policy must be tenant-specific.
**Multi-country relevance:** QES requirements differ by country and use case (e.g., Germany requires a notarised-equivalent QES for certain real estate transactions, while Estonia accepts AdES for most government services); the platform must enforce the correct level per tenant's operating country.

### ESIGN Act / UETA Compliance Mode (United States)
**Why:** The US Login.gov provider is wired but the module has no ESIGN/UETA-specific compliance flow — there is no consumer disclosure step, intent-to-sign capture, or record retention requirement specific to US e-signature law.
**Complexity:** High
**Multi-tenant relevance:** A tenant serving US customers must show the ESIGN disclosure, capture explicit consent, and retain the signed record with the disclosure; tenants operating only in the EU or TR have no such requirement.
**Multi-country relevance:** US federal law (ESIGN) and state law (UETA) impose procedural requirements absent from eIDAS; a single global e-signature flow cannot satisfy both without country-routing the compliance steps.

### Per-Country Minimum Identity Assurance Policy
**Why:** The minimum LoA is currently read from a single global env var (`EID_REQUIRED_LOA`), ignoring the tenant-scoped `eidRequiredLoA` setting; tenants serving high-risk industries in strict regulatory environments (healthcare, finance, notarial) cannot raise their LoA floor above the platform default.
**Complexity:** Low
**Multi-tenant relevance:** An insurance tenant may require `high` LoA while a collaboration tool tenant accepts `substantial`; both must be expressible without redeploying the platform.
**Multi-country relevance:** Regulatory bodies in different countries specify minimum LoA thresholds for specific transaction types (e.g., France ANSSI LoA 3 for health data, Turkey BTK rules for mobile banking); per-tenant per-country LoA enforcement is a legal requirement in those markets.

### Turkey KamuSM KVKK Data Residency Compliance
**Why:** Turkish Law No. 6698 (KVKK) requires that personal data of Turkish citizens be processed and stored within Turkey or with explicit consent for cross-border transfer; the `SigningCertificate` entity (which stores national ID hashes and identity claims) currently has no data residency flag or routing to a Turkey-regional database.
**Complexity:** High
**Multi-tenant relevance:** Tenants registered as Turkish data controllers under KVKK must be able to store all Turkish citizen identity data in a Turkish-region data store, independently of where the rest of the platform is deployed.
**Multi-country relevance:** Analogous requirements exist in the EU (GDPR Art. 44-49 cross-border transfers), Russia (FZ-152), China (PIPL), and others; a per-country data-residency routing model is foundational to global compliance.

---

## Document Signing (v2 Readiness)

### PAdES B-LTA Document Signing End-to-End Flow
**Why:** The signing interface (`initiateDocumentSign` / `pollDocumentSignResult`) exists on `BaseESignatureProvider` but all concrete providers throw `NotImplementedError`; the platform cannot sign a PDF document today despite the infrastructure for challenge/poll and TSA being partially in place.
**Complexity:** High
**Multi-tenant relevance:** Document signing workflows (contracts, NDAs, consent forms) are the core value proposition for legal-tech and HR tenants; a tenant cannot go live with signed-document workflows until at least one provider implements PAdES.
**Multi-country relevance:** PAdES B-LTA with an RFC 3161 timestamp is the legally required format for long-term archival signatures in the EU; other formats (CAdES-XL for Turkey, XAdES-BES for Spain) apply in other jurisdictions.

### Signed Document Storage and Long-Term Archival
**Why:** After signing, the signed PDF/document has nowhere to go — there is no integration with `modules/storage` to persist the signed artefact, no link from the transaction record to a stored file, and no retention policy.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant must store signed documents in its own bucket (per-tenant `StorageService` config) with its own retention schedule aligned to its industry's regulatory requirements.
**Multi-country relevance:** EU eIDAS requires long-term signature preservation (LTV stamps every 5-10 years as algorithms weaken); Turkish BTK requires a 10-year minimum retention; US ESIGN requires 7 years for certain financial contracts.

### Signature Verification Endpoint (Third-Party Audit)
**Why:** There is no public or authenticated route to verify whether a stored signature is still valid (LTV re-validation, TSA chain check, revocation re-check), which is required to prove in court that a signature was valid at the time of signing even after certificate expiry.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants in legal or financial verticals will be asked by auditors or courts to prove signature validity retroactively; this must be callable per-tenant without exposing other tenants' signed documents.
**Multi-country relevance:** EU eIDAS validation services (DSS, ETSI EN 319 102) provide a standard verification protocol; US courts rely on hash chain and TSA proof; different verification outputs are needed per jurisdiction.

---

## Provider Ecosystem

### itsme (Belgium / Netherlands / Luxembourg) Provider
**Why:** itsme is the dominant mobile digital identity in the Benelux region with 8M+ enrolled users; the module roadmap lists it but no adapter exists, blocking EU market expansion for tenants targeting those countries.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants serving Belgian or Dutch customers need itsme without it being present for tenants in other markets; the provider-map pattern already supports this.
**Multi-country relevance:** itsme is country-specific to BE/NL/LU; adding it completes the EU provider coverage alongside Smart-ID (Baltic states) and BankID (Sweden).

### FranceConnect+ Provider
**Why:** FranceConnect+ is the French government's eIDAS-substantial identity provider, mandatory as the accepted e-identity for French public services; tenants serving French B2G (business-to-government) workflows require it.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant providing SaaS to French municipalities or health institutions must support FranceConnect+ as a recognised identity provider without affecting tenants in other countries.
**Multi-country relevance:** France-specific identity infrastructure requires country-routing in `EID_PROVIDER_MAP`; the existing architecture supports this but the adapter does not yet exist.

### eIDAS-nPA (German Electronic ID) Provider
**Why:** The German national ID card (nPA) with eIDAS LoA `high` is the primary e-identity for German public and financial services; the module roadmap lists it but no adapter exists.
**Complexity:** High
**Multi-tenant relevance:** Tenants serving German regulated industries (banking, insurance, government) need nPA without imposing the German-specific AusweisApp2 middleware on tenants in other markets.
**Multi-country relevance:** nPA uses a distinct technical stack (SAML/EAC, AusweisApp2 SDK) unique to Germany; correct country-routing prevents the German flow from interfering with other EU country providers.

### Per-Tenant Provider Credentials for Smart-ID and BankID
**Why:** The Smart-ID and BankID providers are configured purely via global env vars (`SMART_ID_*`, `BANKID_SE_*`); unlike the Mobil Imza aggregator (which supports per-tenant API key/customer code), there is no per-tenant credential resolution for Baltic or Swedish providers.
**Complexity:** Medium
**Multi-tenant relevance:** An e-signature SaaS that resells access to different RP accounts on Smart-ID or BankID (where SK ID Solutions issues a separate RP UUID per customer) cannot serve multiple tenants with distinct SK or BankID accounts from a single platform deployment.
**Multi-country relevance:** Smart-ID covers EE/LV/LT and BankID covers SE; per-tenant credentials enable the same multi-account SaaS model already working for TR Mobil Imza to extend to Baltic and Nordic markets.

---

## Certificate and Trust Management

### Automatic LOTL / Trust List Refresh Scheduling
**Why:** `ESignatureTrustListService.ingestAll()` must be called manually or via a one-off cron; there is no built-in scheduled refresh that re-ingests the ETSI LOTL and TR KamuSM trust roots when certificates near expiry or the LOTL is republished.
**Complexity:** Medium
**Multi-tenant relevance:** All tenants share the global trust list; a missed LOTL update causes chain validation failures for all tenants simultaneously with no per-tenant workaround.
**Multi-country relevance:** The EU LOTL is updated several times per year; TR KamuSM roots rotate with new intermediate CAs; automated refresh is required for continuous uptime across all supported countries.

### Certificate Expiry Alerting
**Why:** `SigningCertificate` rows have a `notAfter` column but there is no background job or notification when a user's bound certificate is about to expire; users discover expiry only when a login attempt fails.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins should receive advance notice when their users' certificates approach expiry, scoped to each tenant's user base.
**Multi-country relevance:** Certificate validity periods differ by country and CA (Turkish Mobil Imza certs typically 3 years, Estonian Smart-ID certs 3 years but issued per device, Swedish BankID certs 1-3 years); expiry windows must be configured per-country CA.

---

## Security and Fraud Prevention

### Transaction Rate Limiting per Identifier (Anti-Abuse)
**Why:** The current rate limiter is IP + UA based (`Limiter.checkRateLimit(request, 'auth')`); an attacker who controls many IPs can make unlimited initiation attempts against a single victim's phone number/national ID, triggering repeated SIM-card push notifications (SMS fatigue / MFA bombing).
**Complexity:** Medium
**Multi-tenant relevance:** Tenants in high-risk markets with high fraudster density need stricter per-identifier throttles independently of platform-wide IP rate limits.
**Multi-country relevance:** Mobile signature phishing via repeated push notifications is a documented attack in Turkey (Mobil Imza) and Baltics (Smart-ID); country-specific identifier rate limits are a recommended mitigation by national CAs.

### Fraud / Anomaly Detection on Identity Claims
**Why:** There is no consistency check between a user's previously bound national ID hash and the identity claims returned in a new login; an attacker who obtains access to a victim's SIM or certificate can bind a new certificate with a different national ID to the victim's account.
**Complexity:** High
**Multi-tenant relevance:** Tenants in KYC-regulated industries (banking, insurance) need to detect and block identity claim inconsistencies at the tenant level and trigger a manual review workflow.
**Multi-country relevance:** National ID formats and consistency rules differ per country (TR: 11-digit TCKN, EE: 11-digit isikukood, SE: 10-digit personnummer); fraud detection logic must be country-aware.

# auth_acs — status & research-required items

National/government identity providers. Each ships **gated off** and inert until
configured via `ACS_PROVIDER_MAP`; live access needs a per-country agreement +
certificate/credential exchange. This file tracks what is implemented vs. what
still needs live verification or is genuinely out of scope.

## Implemented (verify against the provider's test stand before prod)

- **SAML family** (`tr_edevlet`, `ct_edevlet` KKTC/TÜRKSAT, `eu_eidas`, `it_spid`,
  `es_clave`, `de_eid`): signed AuthnRequest, encrypted-assertion decryption,
  replay detection, RequestedAuthnContext/LoA. SPID/eIDAS metadata + attribute
  names default-but-overridable.
- **OIDC family** (`uz_oneid`, `az_mygovid`, `us_login_gov`, `us_id_me`): JWKS
  id_token verification, nonce, discovery.
- **`esia_ru` (Russia — Gosuslugi/ЕСИА)**: OAuth2 with PKCS#7 **detached CMS**
  request signing (`signingCert`/`signingKey` in ACS_PROVIDER_MAP); oid from the
  access_token JWT (`urn:esia:sbj_id`); names via REST `/rs/prns/{oid}`. The CMS
  signer is unit-tested (sign→verify roundtrip). **Verify before prod**: endpoint
  version (v1 `/aas/oauth2` vs v2), exact scope/param set, signature encoding.

## Research-required / out of scope

- **GOST cryptography (Russia)**: ESIA production may mandate GOST R 34.10/34.11
  signatures/TLS. Node WebCrypto + pkijs are **RSA-only** — GOST needs a certified
  CSP (e.g. КриптоПро) and native bindings. Not implemented; RSA test stands work.
- **China national ID — CTID / 国家网络身份认证 (RealDID)**: not a public OIDC/SAML
  federation; access is app-gated and government-approved. No standard third-party
  login endpoint to integrate. Tracked here; **not** shipped as a half-working
  provider. China **consumer** login is covered in `auth_sso` (WeChat, QQ, Weibo,
  Alipay).
- **`kz_egov`, `kg_tunduk`**: protocol/endpoints unconfirmed — skeletons, gated off
  until verified, then wired to the SAML or OIDC base accordingly.

## Notes

- Identity is keyed on `sha256(nationalId)` stored under `acs:<provider>` in
  `user_social_account`; raw national IDs are never persisted.
- No-email providers route through the shared synthetic-email + complete-profile
  + account-merge flow.

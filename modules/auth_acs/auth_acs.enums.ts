import { z } from 'zod';

/**
 * National / government digital-identity providers ("ACS" — national Assertion
 * Consumer Service style logins, e.g. Türkiye e-Devlet). Unlike the per-tenant
 * SAML module (auth_saml), each of these is a SINGLE national IdP shared by the
 * whole platform, keyed on a national identifier (TCKN / fiscalNumber / DNI /
 * eIDAS PersonIdentifier / PINFL …) rather than email.
 *
 * Providers span two transport protocols (see AcsProtocol). The enum value is
 * also the URL segment (/api/auth/acs/<provider>/…) and the stored social-account
 * provider key (`acs:<provider>`).
 */
export const AcsProviderEnum = z.enum([
  // ── TÜRKSAT / e-Devlet family (SAML) ──────────────────────────────────────
  'tr_edevlet',   // Türkiye — e-Devlet Kapısı
  'ct_edevlet',   // KKTC (Northern Cyprus) — edevlet.gov.ct.tr (TÜRKSAT)
  // ── Turkic republics ──────────────────────────────────────────────────────
  'az_mygovid',   // Azerbaijan — MyGov ID / ASAN Login (OIDC/OAuth)
  'uz_oneid',     // Uzbekistan — OneID (OAuth2, sso.egov.uz)
  'kz_egov',      // Kazakhstan — eGov.kz (protocol TBC; gated off)
  'kg_tunduk',    // Kyrgyzstan — Tunduk (protocol TBC; gated off)
  // ── Europe (SAML / eIDAS family) ──────────────────────────────────────────
  'eu_eidas',     // eIDAS generic node
  'it_spid',      // Italy — SPID
  'es_clave',     // Spain — Cl@ve
  'de_eid',       // Germany — eID (eID-Server / eIDAS)
  // ── United States ─────────────────────────────────────────────────────────
  'us_login_gov', // Login.gov (OIDC; SAML alternative)
  'us_id_me',     // ID.me (OIDC)
]);

export type AcsProvider = z.infer<typeof AcsProviderEnum>;

/** Transport protocol a provider speaks. The identity layer is protocol-agnostic. */
export const AcsProtocolEnum = z.enum(['saml', 'oidc']);
export type AcsProtocol = z.infer<typeof AcsProtocolEnum>;

/** The social-account provider key under which an ACS identity is stored/linked. */
export function acsSocialProviderKey(provider: AcsProvider): string {
  return `acs:${provider}`;
}

import type { AcsProvider } from './auth_acs.enums';
import type { AcsProviderDescriptor } from './auth_acs.types';

const NAMEID_UNSPECIFIED = 'urn:oasis:names:tc:SAML:2.0:nameid-format:unspecified';
const NAMEID_PERSISTENT = 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent';
const EIDAS_NS = 'http://eidas.europa.eu/attributes/naturalperson';

/**
 * Static, NON-SECRET provider catalog. Holds protocol, country, button label and
 * the default attribute/claim names + public endpoint URLs for each national IdP.
 *
 * Secrets, certificates, the enabled flag and any deployment-specific URLs come
 * from the ACS_PROVIDER_MAP env var (see auth_acs.config.service) and override
 * the defaults below. A provider with no usable config resolves to `enabled:false`
 * and refuses to start a login — it never fakes success.
 *
 * Endpoint defaults are filled only where the protocol/URLs are publicly known and
 * verified. Where they are not yet confirmed (kz_egov, kg_tunduk, and the exact
 * production endpoints for several others) they are intentionally left blank so the
 * provider stays disabled until configured via ACS_PROVIDER_MAP.
 */
export const ACS_CATALOG: Record<AcsProvider, AcsProviderDescriptor> = {
  // ── TÜRKSAT / e-Devlet family (SAML) ───────────────────────────────────────
  tr_edevlet: {
    provider: 'tr_edevlet', protocol: 'saml', country: 'TR', label: 'e-Devlet ile Giriş',
    defaults: { attrNationalId: 'tckn', attrFirstName: 'ad', attrLastName: 'soyad', nameIdFormat: NAMEID_UNSPECIFIED },
  },
  ct_edevlet: {
    provider: 'ct_edevlet', protocol: 'saml', country: 'CT', label: 'e-Devlet (KKTC) ile Giriş',
    defaults: { attrNationalId: 'tckn', attrFirstName: 'ad', attrLastName: 'soyad', nameIdFormat: NAMEID_UNSPECIFIED },
  },

  // ── Turkic republics ────────────────────────────────────────────────────────
  az_mygovid: {
    provider: 'az_mygovid', protocol: 'oidc', country: 'AZ', label: 'MyGov ID',
    defaults: { attrNationalId: 'pin', attrFirstName: 'given_name', attrLastName: 'family_name', scopes: ['openid', 'profile'], usesPkce: true },
  },
  uz_oneid: {
    provider: 'uz_oneid', protocol: 'oidc', country: 'UZ', label: 'OneID',
    defaults: {
      attrNationalId: 'pin', attrFirstName: 'first_name', attrLastName: 'sur_name',
      authUrl: 'https://sso.egov.uz/sso/oauth/Authorization.do',
      tokenUrl: 'https://sso.egov.uz/sso/oauth/Authorization.do',
      userInfoUrl: 'https://sso.egov.uz/sso/oauth/Authorization.do',
      scopes: ['myportal'], usesPkce: false,
    },
  },
  kz_egov: {
    provider: 'kz_egov', protocol: 'oidc', country: 'KZ', label: 'eGov.kz',
    defaults: { attrNationalId: 'iin', attrFirstName: 'given_name', attrLastName: 'family_name', scopes: ['openid'], usesPkce: true },
  },
  kg_tunduk: {
    provider: 'kg_tunduk', protocol: 'oidc', country: 'KG', label: 'Tunduk',
    defaults: { attrNationalId: 'pin', attrFirstName: 'given_name', attrLastName: 'family_name', scopes: ['openid'], usesPkce: true },
  },

  // ── Europe (SAML / eIDAS family) ─────────────────────────────────────────────
  eu_eidas: {
    provider: 'eu_eidas', protocol: 'saml', country: 'EU', label: 'eIDAS',
    defaults: {
      attrNationalId: `${EIDAS_NS}/PersonIdentifier`,
      attrFirstName: `${EIDAS_NS}/CurrentGivenName`,
      attrLastName: `${EIDAS_NS}/CurrentFamilyName`,
      nameIdFormat: NAMEID_PERSISTENT,
    },
  },
  it_spid: {
    provider: 'it_spid', protocol: 'saml', country: 'IT', label: 'Entra con SPID',
    defaults: { attrNationalId: 'fiscalNumber', attrFirstName: 'name', attrLastName: 'familyName', nameIdFormat: NAMEID_PERSISTENT },
  },
  es_clave: {
    provider: 'es_clave', protocol: 'saml', country: 'ES', label: 'Cl@ve',
    defaults: {
      attrNationalId: `${EIDAS_NS}/PersonIdentifier`,
      attrFirstName: `${EIDAS_NS}/CurrentGivenName`,
      attrLastName: `${EIDAS_NS}/CurrentFamilyName`,
      nameIdFormat: NAMEID_PERSISTENT,
    },
  },
  de_eid: {
    provider: 'de_eid', protocol: 'saml', country: 'DE', label: 'Online-Ausweis (eID)',
    defaults: { attrNationalId: 'RestrictedID', attrFirstName: 'GivenNames', attrLastName: 'FamilyNames', nameIdFormat: NAMEID_PERSISTENT },
  },

  // ── United States ────────────────────────────────────────────────────────────
  us_login_gov: {
    provider: 'us_login_gov', protocol: 'oidc', country: 'US', label: 'Login.gov',
    defaults: {
      attrNationalId: 'sub', attrFirstName: 'given_name', attrLastName: 'family_name',
      issuer: 'https://secure.login.gov',
      authUrl: 'https://secure.login.gov/openid_connect/authorize',
      tokenUrl: 'https://secure.login.gov/api/openid_connect/token',
      userInfoUrl: 'https://secure.login.gov/api/openid_connect/userinfo',
      scopes: ['openid', 'profile'], usesPkce: true,
    },
  },
  us_id_me: {
    provider: 'us_id_me', protocol: 'oidc', country: 'US', label: 'ID.me',
    defaults: {
      attrNationalId: 'sub', attrFirstName: 'fname', attrLastName: 'lname',
      authUrl: 'https://api.id.me/oauth/authorize',
      tokenUrl: 'https://api.id.me/oauth/token',
      userInfoUrl: 'https://api.id.me/api/public/v3/attributes.json',
      scopes: ['openid'], usesPkce: true,
    },
  },
};

export const ACS_PROVIDERS = Object.keys(ACS_CATALOG) as AcsProvider[];

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted so the env mock factory can reference it (vi.mock is hoisted to top).
const envMock = vi.hoisted(() => ({
  env: {
    APPLICATION_HOST: 'https://app.test',
    CSRF_SECRET: 'unit_test_csrf_secret',
    ACS_PROVIDER_MAP: JSON.stringify({
      tr_edevlet: { enabled: true, idpSsoUrl: 'https://giris.turkiye.gov.tr/sso', idpCertificate: 'CERT', spPrivateKey: 'KEY' },
      it_spid: { enabled: true, idpSsoUrl: 'https://spid.idp/sso', idpCertificate: 'CERT' },
      uz_oneid: { enabled: true, clientId: 'cid', clientSecret: 'secret' },
      us_login_gov: { enabled: false },
    }),
  } as Record<string, unknown>,
}));
vi.mock('@kuraykaraaslan/env', () => envMock);
vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@kuraykaraaslan/observability', () => ({ default: { recordTenantUsage: vi.fn() } }));
vi.mock('@kuraykaraaslan/redis', () => ({ default: { set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1) } }));
vi.mock('@kuraykaraaslan/db', () => ({ getDataSource: vi.fn(), tenantDataSourceFor: vi.fn() }));

import { acsSocialProviderKey } from '../auth_acs.enums';
import AuthAcsConfigService from '../auth_acs.config.service';
import { BaseSamlProvider } from '@kuraykaraaslan/auth_saml/server/saml.engine';
import { signAcsRelay, parseAcsRelay } from '../auth_acs.relay';
import AuthAcsFlowService from '../auth_acs.flow.service';

beforeEach(() => AuthAcsConfigService.resetCache());

describe('auth_acs config resolution', () => {
  it('disables a provider by default (no map entry)', () => {
    expect(AuthAcsConfigService.isEnabled('eu_eidas')).toBe(false);
  });

  it('enables a SAML provider only when SSO URL + cert are present', () => {
    expect(AuthAcsConfigService.isEnabled('tr_edevlet')).toBe(true);
    const c = AuthAcsConfigService.resolveConfig('tr_edevlet');
    expect(c.protocol).toBe('saml');
    expect(c.attrNationalId).toBe('tckn');
    expect(c.spEntityId).toBe('https://app.test/tenant/00000000-0000-4000-8000-000000000000/api/auth/acs/tr_edevlet/metadata');
  });

  it('enables an OIDC provider only when auth/token URL + clientId are present', () => {
    expect(AuthAcsConfigService.isEnabled('uz_oneid')).toBe(true);
    const c = AuthAcsConfigService.resolveConfig('uz_oneid');
    expect(c.protocol).toBe('oidc');
    expect(c.redirectUri).toBe('https://app.test/tenant/00000000-0000-4000-8000-000000000000/api/auth/acs/uz_oneid/callback');
  });

  it('treats enabled:false as disabled even with defaults present', () => {
    expect(AuthAcsConfigService.isEnabled('us_login_gov')).toBe(false);
  });

  it('rejects an unknown provider', () => {
    expect(() => AuthAcsConfigService.assertKnown('not_a_country')).toThrow();
  });

  it('lists only enabled+configured providers', () => {
    expect(AuthAcsConfigService.enabledProviders().sort()).toEqual(['it_spid', 'tr_edevlet', 'uz_oneid']);
  });
});

// Providers are now sandboxed community plugins (no built-in factories): attribute
// mapping lives in the plugin bundle + the host-side broker (crypto/saml) caps, so
// the per-provider mapping unit tests moved out. The shared auth_saml engine statics
// these built on are still exercised here.
describe('auth_saml engine statics', () => {
  it('engine sha256 is deterministic 64-hex (trim-stable)', () => {
    const h = BaseSamlProvider.sha256('11111111110');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(BaseSamlProvider.sha256(' 11111111110 '));
  });

  it('engine extractSessionNotOnOrAfter parses the timestamp', () => {
    const xml = '<Assertion><AuthnStatement SessionNotOnOrAfter="2999-01-01T00:00:00Z"/></Assertion>';
    expect(BaseSamlProvider.extractSessionNotOnOrAfter(xml)).toBe(Date.parse('2999-01-01T00:00:00Z'));
    expect(BaseSamlProvider.extractSessionNotOnOrAfter(null)).toBeNull();
  });
});

describe('relay state', () => {
  it('round-trips tenant + return path', () => {
    const relay = signAcsRelay('tenant-123', '/tenant/tenant-123/admin');
    expect(parseAcsRelay(relay)).toEqual({ tenantId: 'tenant-123', returnPath: '/tenant/tenant-123/admin' });
  });

  it('rejects a tampered/foreign token', () => {
    expect(parseAcsRelay('not-a-jwt')).toBeNull();
    expect(parseAcsRelay(undefined)).toBeNull();
  });
});

describe('synthetic email', () => {
  it('produces a recognisable placeholder address per provider+hash', () => {
    const hash = 'a'.repeat(64);
    const email = AuthAcsFlowService.syntheticEmail('tr_edevlet', hash);
    expect(email).toBe(`acs-tr_edevlet-${hash}@noreply.invalid`);
    // Must match auth_sso's placeholder-domain check so the shared completion flow triggers.
    expect(email.endsWith('@noreply.invalid')).toBe(true);
  });
});

describe('social provider key', () => {
  it('namespaces ACS identities under acs:<provider>', () => {
    expect(acsSocialProviderKey('tr_edevlet')).toBe('acs:tr_edevlet');
  });
});

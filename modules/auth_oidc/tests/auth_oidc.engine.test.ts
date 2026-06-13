import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/modules/env', () => ({ env: { CSRF_SECRET: 'unit_test_csrf_secret' } }));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import axios from 'axios';
import { BaseOidcProvider, type OidcEngineConfig } from '../auth_oidc.engine';
import { _clearJwksCache } from '../auth_oidc.jwks';
import { _clearDiscoveryCache } from '../auth_oidc.discovery';

const axiosGet = axios.get as unknown as ReturnType<typeof vi.fn>;
const axiosPost = axios.post as unknown as ReturnType<typeof vi.fn>;

// ── A real RSA keypair so signatures actually verify ─────────────────────────
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PRIVATE_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const JWK = { ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>), kid: 'test-kid', alg: 'RS256', use: 'sig' };

const ISSUER = 'https://idp.test';
const JWKS_URI = 'https://idp.test/jwks';
const DISCOVERY = {
  issuer: ISSUER,
  authorization_endpoint: 'https://idp.test/authorize',
  token_endpoint: 'https://idp.test/token',
  userinfo_endpoint: 'https://idp.test/userinfo',
  jwks_uri: JWKS_URI,
};

function signIdToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, PRIVATE_PEM, { algorithm: 'RS256', keyid: 'test-kid' });
}

function baseClaims(extra: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return { iss: ISSUER, aud: 'client-1', sub: 'user-123', iat: now, exp: now + 3600, ...extra };
}

class TestOidc extends BaseOidcProvider {
  constructor(cfg: Partial<OidcEngineConfig> = {}) {
    super({ clientId: 'client-1', redirectUri: 'https://app.test/cb', scopes: ['openid'], pkceSalt: 'test', usesPkce: true, ...cfg });
  }
  async authUrl(state: string, nonce?: string) { await this.ensureEndpoints(); return this.generateAuthUrl(state, nonce ? { nonce } : undefined); }
  claims(code: string, state?: string, opts?: { nonce?: string }) { return this.getClaims(code, state, opts); }
}

// Route axios.get by URL (discovery / jwks / userinfo).
function wireGets(userinfo?: Record<string, unknown>) {
  axiosGet.mockImplementation(async (url: string) => {
    if (url.includes('/.well-known/openid-configuration')) return { data: DISCOVERY };
    if (url === JWKS_URI) return { data: { keys: [JWK] } };
    return { data: userinfo ?? {} };
  });
}

beforeEach(() => {
  axiosGet.mockReset();
  axiosPost.mockReset();
  _clearJwksCache();
  _clearDiscoveryCache();
});

describe('OIDC discovery', () => {
  it('resolves endpoints + jwks_uri from the issuer .well-known document', async () => {
    wireGets();
    const p = new TestOidc({ issuer: ISSUER });
    const url = await p.authUrl('state-1', 'NONCE1');
    expect(url).toContain('https://idp.test/authorize');
    expect(url).toContain('nonce=NONCE1'); // nonce passed through
    expect(url).toContain('code_challenge=');
  });
});

describe('id_token verification', () => {
  it('accepts a JWKS-signed id_token and returns its claims (no userinfo)', async () => {
    wireGets();
    axiosPost.mockResolvedValueOnce({ data: { access_token: 'at', id_token: signIdToken(baseClaims()) } });
    const p = new TestOidc({ issuer: ISSUER, userInfoUrl: undefined });
    // issuer discovery sets userinfo_endpoint, so null it to exercise the id_token-only path
    (p as unknown as { oidcConfig: OidcEngineConfig }).oidcConfig.userInfoUrl = undefined;
    (p as unknown as { oidcConfig: OidcEngineConfig }).oidcConfig.jwksUri = JWKS_URI;
    (p as unknown as { oidcConfig: OidcEngineConfig }).oidcConfig.issuer = ISSUER;
    const claims = await p.claims('code-1', 'state-1');
    expect(claims.sub).toBe('user-123');
  });

  it('rejects an id_token signed by the wrong key', async () => {
    wireGets();
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const forged = jwt.sign(baseClaims(), other.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string, { algorithm: 'RS256', keyid: 'test-kid' });
    axiosPost.mockResolvedValueOnce({ data: { access_token: 'at', id_token: forged } });
    const p = new TestOidc({ issuer: ISSUER });
    (p as unknown as { oidcConfig: OidcEngineConfig }).oidcConfig.userInfoUrl = undefined;
    await expect(p.claims('code-1', 'state-1')).rejects.toThrow();
  });

  it('rejects a nonce mismatch (replay defence)', async () => {
    wireGets();
    axiosPost.mockResolvedValueOnce({ data: { access_token: 'at', id_token: signIdToken(baseClaims({ nonce: 'GOOD' })) } });
    const p = new TestOidc({ issuer: ISSUER });
    (p as unknown as { oidcConfig: OidcEngineConfig }).oidcConfig.userInfoUrl = undefined;
    await expect(p.claims('code-1', 'state-1', { nonce: 'BAD' })).rejects.toThrow();
  });

  it('accepts a matching nonce', async () => {
    wireGets();
    axiosPost.mockResolvedValueOnce({ data: { access_token: 'at', id_token: signIdToken(baseClaims({ nonce: 'N1' })) } });
    const p = new TestOidc({ issuer: ISSUER });
    (p as unknown as { oidcConfig: OidcEngineConfig }).oidcConfig.userInfoUrl = undefined;
    const claims = await p.claims('code-1', 'state-1', { nonce: 'N1' });
    expect(claims.sub).toBe('user-123');
  });

  it('rejects when id_token and userinfo subjects differ (token substitution)', async () => {
    wireGets({ sub: 'DIFFERENT', email: 'x@y.z' });
    axiosPost.mockResolvedValueOnce({ data: { access_token: 'at', id_token: signIdToken(baseClaims({ sub: 'user-123' })) } });
    const p = new TestOidc({ issuer: ISSUER });
    await expect(p.claims('code-1', 'state-1')).rejects.toThrow();
  });

  it('refuses an id_token when no JWKS endpoint is available', async () => {
    axiosPost.mockResolvedValueOnce({ data: { access_token: 'at', id_token: signIdToken(baseClaims()) } });
    const p = new TestOidc({ tokenUrl: 'https://idp.test/token' }); // no issuer/jwksUri/userInfoUrl
    await expect(p.claims('code-1', 'state-1')).rejects.toThrow();
  });
});

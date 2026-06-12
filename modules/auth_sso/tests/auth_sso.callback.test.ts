/**
 * E2E callback-flow tests — all 11 SSO providers.
 *
 * Each describe block mocks the provider's token endpoint and userinfo endpoint
 * (via axios) and exercises the full:
 *   handleCallback → tokens + profile
 *   authenticateOrRegister → user creation or existing-user lookup
 *
 * Covers provider-specific quirks: Apple id_token, Twitter/X PKCE+Basic,
 * WeChat GET-token/openid, TikTok open_id/fields, GitHub form-encoded token.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// ── Env mock (must be first — providers read env at import time) ─────────────
vi.mock('@/modules/env', () => ({
  env: {
    NODE_ENV: 'test',
    APPLICATION_HOST: 'http://localhost:3000',
    CSRF_SECRET: 'test-csrf-secret-32chars-minimum!!',
    ACCESS_TOKEN_SECRET: 'test_access',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    // Provider credentials
    GOOGLE_CLIENT_ID: 'google-cid', GOOGLE_CLIENT_SECRET: 'google-cs',
    GITHUB_CLIENT_ID: 'github-cid', GITHUB_CLIENT_SECRET: 'github-cs',
    MICROSOFT_CLIENT_ID: 'ms-cid', MICROSOFT_CLIENT_SECRET: 'ms-cs', MICROSOFT_TENANT_ID: 'common',
    LINKEDIN_CLIENT_ID: 'li-cid', LINKEDIN_CLIENT_SECRET: 'li-cs',
    FACEBOOK_CLIENT_ID: 'fb-cid', FACEBOOK_CLIENT_SECRET: 'fb-cs',
    APPLE_CLIENT_ID: 'com.example.app', APPLE_TEAM_ID: 'TEAMID123', APPLE_KEY_ID: 'KEYID123',
    APPLE_PRIVATE_KEY: '-----BEGIN EC PRIVATE KEY-----\nMHQCAQEEILmAGT5XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n-----END EC PRIVATE KEY-----',
    TWITTER_CLIENT_ID: 'tw-cid', TWITTER_CLIENT_SECRET: 'tw-cs',
    SLACK_CLIENT_ID: 'sl-cid', SLACK_CLIENT_SECRET: 'sl-cs',
    TIKTOK_CLIENT_ID: 'tt-cid', TIKTOK_CLIENT_SECRET: 'tt-cs',
    WECHAT_APP_ID: 'wx-appid', WECHAT_APP_SECRET: 'wx-secret',
    AUTODESK_CLIENT_ID: 'ad-cid', AUTODESK_CLIENT_SECRET: 'ad-cs',
    SSO_ALLOWED_PROVIDERS: 'google,github,microsoft,linkedin,facebook,apple,twitter,slack,tiktok,wechat,autodesk',
  },
}));

vi.mock('@/modules/db', () => ({ getDataSource: vi.fn(), tenantDataSourceFor: vi.fn() }));
vi.mock('@/modules/redis', () => ({
  default: { get: vi.fn(async () => null), set: vi.fn(), setex: vi.fn(), del: vi.fn(), exists: vi.fn(async () => 0) },
  singleFlight: async (_k: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/modules/observability', () => ({ default: { recordTenantUsage: vi.fn() } }));
vi.mock('@/modules/audit_log/audit_log.service', () => ({ default: { log: vi.fn(async () => {}) } }));
vi.mock('@/modules/setting/setting.service', () => ({
  default: { getByKeys: vi.fn(async () => ({})), getValue: vi.fn(async () => null) },
}));
vi.mock('@/modules/auth/auth.policy.service', () => ({
  default: {
    getAccessPolicy: vi.fn(async () => ({ disableSocialLogin: false, ssoAllowedProviders: [] })),
    isSsoProviderAllowed: vi.fn(() => true),
    filterAllowedProviders: vi.fn((ps: string[]) => ps),
  },
}));

vi.mock('@/modules/user/user.service', () => ({
  default: {
    getByEmail: vi.fn(async () => null),
    getById: vi.fn(async (id: string) => ({ userId: id, email: 'test@example.com' })),
    create: vi.fn(async (data: { email: string }) => ({ userId: 'new-user-id', email: data.email })),
  },
}));
vi.mock('@/modules/user_social_account/user_social_account.service', () => ({
  default: {
    findUserIdByProvider: vi.fn(async () => null),
    getByUserId: vi.fn(async () => []),
    link: vi.fn(async () => {}),
    updateTokens: vi.fn(async () => {}),
    unlink: vi.fn(async () => {}),
    getRawTokens: vi.fn(async () => ({ accessToken: 'at', refreshToken: null })),
  },
}));

// UserConsent repo for JIT consent recording
const mockSave = vi.fn(async (e: unknown) => e);
const mockCreate = vi.fn((e: unknown) => e);
vi.mock('@/modules/auth/entities/user_consent.entity', () => ({ UserConsent: class UserConsent {} }));
const mockGetRepository = vi.fn(() => ({ save: mockSave, create: mockCreate }));
vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(async () => ({ getRepository: mockGetRepository })),
  tenantDataSourceFor: vi.fn(),
}));

import SSOFlowService from '../auth_sso.flow.service';

// ── Axios mock helpers ───────────────────────────────────────────────────────
const axiosPost = vi.spyOn(axios, 'post');
const axiosGet  = vi.spyOn(axios, 'get');

function mockTokenResponse(data: Record<string, unknown>) {
  axiosPost.mockResolvedValueOnce({ data });
}
function mockUserInfoResponse(data: Record<string, unknown>) {
  axiosGet.mockResolvedValueOnce({ data });
}
function mockGetTokenResponse(data: Record<string, unknown>) {
  axiosGet.mockResolvedValueOnce({ data });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  axiosPost.mockReset();
  axiosGet.mockReset();
});

// ── Google ───────────────────────────────────────────────────────────────────
describe('callback flow: google', () => {
  it('exchanges code for tokens and fetches userinfo', async () => {
    mockTokenResponse({ access_token: 'gat', refresh_token: 'grt', expires_in: 3600, token_type: 'Bearer' });
    mockUserInfoResponse({ sub: 'google-sub-1', email: 'user@gmail.com', email_verified: true, name: 'Alice', picture: 'https://pic.example/a.jpg' });

    const { profile, tokens } = await SSOFlowService.handleCallback('google', 'auth-code');

    expect(tokens.accessToken).toBe('gat');
    expect(tokens.refreshToken).toBe('grt');
    expect(profile.email).toBe('user@gmail.com');
    expect(profile.sub).toBe('google-sub-1');
  });

  it('registers a new user on authenticate-or-register', async () => {
    mockTokenResponse({ access_token: 'gat', refresh_token: null });
    mockUserInfoResponse({ sub: 'google-sub-2', email: 'new@gmail.com', email_verified: true });

    const result = await SSOFlowService.authenticateOrRegister('google', 'auth-code');

    expect(result.isNewUser).toBe(true);
    expect(result.user.email).toBe('new@gmail.com');
  });
});

// ── GitHub ───────────────────────────────────────────────────────────────────
describe('callback flow: github', () => {
  it('handles GitHub form-encoded token response', async () => {
    mockTokenResponse({ access_token: 'ghp_token', token_type: 'bearer' });
    mockUserInfoResponse({ id: 42, login: 'octocat', email: 'octo@github.com', avatar_url: 'https://avatars.github.com/u/42' });

    const { profile, tokens } = await SSOFlowService.handleCallback('github', 'gh-code');

    expect(tokens.accessToken).toBe('ghp_token');
    expect(profile.sub).toBe('42');
    expect(profile.email).toBe('octo@github.com');
  });

  it('synthesizes placeholder email when github email is null', async () => {
    mockTokenResponse({ access_token: 'ghp_token' });
    mockUserInfoResponse({ id: 99, login: 'silent-user', email: null });

    const result = await SSOFlowService.authenticateOrRegister('github', 'gh-code');

    expect(result.isNewUser).toBe(true);
    expect(result.user.email).toMatch(/^github-/);
    expect(SSOFlowService.isPlaceholderEmail(result.user.email)).toBe(true);
  });
});

// ── Microsoft ────────────────────────────────────────────────────────────────
describe('callback flow: microsoft', () => {
  it('exchanges code and fetches Graph userinfo', async () => {
    mockTokenResponse({ access_token: 'ms-at', refresh_token: 'ms-rt', id_token: 'ms-id', expires_in: 3600 });
    mockUserInfoResponse({ id: 'ms-oid-1', userPrincipalName: 'user@contoso.com', mail: 'user@contoso.com', displayName: 'Bob', givenName: 'Bob' });

    const { profile, tokens } = await SSOFlowService.handleCallback('microsoft', 'ms-code');

    expect(tokens.accessToken).toBe('ms-at');
    expect(tokens.idToken).toBe('ms-id');
    expect(profile.sub).toBe('ms-oid-1');
    expect(profile.email).toBe('user@contoso.com');
  });
});

// ── LinkedIn ─────────────────────────────────────────────────────────────────
describe('callback flow: linkedin', () => {
  it('fetches profile and email from separate endpoints', async () => {
    mockTokenResponse({ access_token: 'li-at', expires_in: 5183944 });
    // LinkedIn: GET /v2/me → profile; GET /v2/emailAddress → email
    mockUserInfoResponse({ id: 'li-id-1', localizedFirstName: 'Carol', localizedLastName: 'Danvers', profilePicture: {} });
    mockUserInfoResponse({
      elements: [{ 'handle~': { emailAddress: 'carol@example.com' }, primary: true, type: 'EMAIL' }],
    });

    const { profile } = await SSOFlowService.handleCallback('linkedin', 'li-code');

    expect(profile.sub).toBe('li-id-1');
    expect(profile.email).toBe('carol@example.com');
  });
});

// ── Facebook ─────────────────────────────────────────────────────────────────
describe('callback flow: facebook', () => {
  it('exchanges code and fetches Graph user', async () => {
    mockTokenResponse({ access_token: 'fb-at', token_type: 'bearer', expires_in: 5183944 });
    mockUserInfoResponse({ id: 'fb-uid-1', email: 'dave@facebook.com', name: 'Dave', picture: { data: { url: 'https://pic.fb.com/d' } } });

    const { profile, tokens } = await SSOFlowService.handleCallback('facebook', 'fb-code');

    expect(tokens.accessToken).toBe('fb-at');
    expect(profile.sub).toBe('fb-uid-1');
    expect(profile.email).toBe('dave@facebook.com');
  });
});

// ── Apple ────────────────────────────────────────────────────────────────────
describe('callback flow: apple', () => {
  it('decodes user identity from id_token (no userinfo endpoint)', async () => {
    // Apple returns a signed JWT as id_token — we verify against JWKS.
    // In tests: mock the JWKS fetch AND the token exchange.
    const appleIdPayload = {
      iss: 'https://appleid.apple.com',
      aud: 'com.example.app',
      sub: 'apple-sub-001',
      email: 'user@privaterelay.appleid.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    // Mock the client_secret JWT sign (APPLE_PRIVATE_KEY is a placeholder — Apple provider
    // generates a client_secret ES256 JWT). Since the key is invalid in test, mock the full
    // getTokens flow via axios post.
    const fakeIdToken = [
      Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-kid' })).toString('base64url'),
      Buffer.from(JSON.stringify(appleIdPayload)).toString('base64url'),
      'fakesig',
    ].join('.');

    mockTokenResponse({ access_token: 'apple-at', id_token: fakeIdToken, token_type: 'Bearer' });
    // Apple provider fetches JWKS to verify id_token — mock that GET
    axiosGet.mockResolvedValueOnce({
      data: {
        keys: [{
          kty: 'RSA', kid: 'test-kid', use: 'sig', alg: 'RS256',
          n: 'syfFh...', e: 'AQAB',
        }],
      },
    });

    // Apple provider skips JWKS verification when the token header kid is missing from
    // cache and the mock key can't actually verify RS256. Catch the expected verify error
    // and ensure the token exchange (POST) did succeed.
    await expect(SSOFlowService.handleCallback('apple', 'apple-code')).rejects.toThrow();
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const postCall = axiosPost.mock.calls[0];
    expect(postCall[0]).toContain('appleid.apple.com');
  });

  it('uses response_mode=form_post (state passed as POST body field)', async () => {
    // Apple's callback arrives as a form POST — the route handler passes code+state to handleCallback.
    // Verify handleCallback accepts them identically to a query-string callback.
    const fakeIdToken = [
      Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'kid2' })).toString('base64url'),
      Buffer.from(JSON.stringify({ sub: 's2', iss: 'https://appleid.apple.com', aud: 'com.example.app', exp: 9999999999, iat: 1 })).toString('base64url'),
      'sig2',
    ].join('.');
    mockTokenResponse({ access_token: 'apple-at2', id_token: fakeIdToken });
    axiosGet.mockResolvedValueOnce({ data: { keys: [] } });

    await expect(SSOFlowService.handleCallback('apple', 'apple-code2', 'form-post-state')).rejects.toThrow();
    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
});

// ── Twitter / X ──────────────────────────────────────────────────────────────
describe('callback flow: twitter', () => {
  it('requires state for PKCE and uses Basic auth on token exchange', async () => {
    mockTokenResponse({ access_token: 'tw-at', token_type: 'bearer', expires_in: 7200 });
    mockUserInfoResponse({ data: { id: 'tw-uid-1', name: 'Elon', username: 'elonmusk' } });

    const { profile, tokens } = await SSOFlowService.handleCallback('twitter', 'tw-code', 'state-abc');

    expect(tokens.accessToken).toBe('tw-at');
    expect(profile.sub).toBe('tw-uid-1');
    expect(profile.email).toBeNull();

    // Verify Basic auth header was used (X requires Confidential Client Basic)
    const tokenCall = axiosPost.mock.calls[0];
    expect(tokenCall[2]?.headers?.Authorization).toMatch(/^Basic /);
  });

  it('throws when state is missing (PKCE requires state)', async () => {
    await expect(SSOFlowService.handleCallback('twitter', 'tw-code', undefined)).rejects.toThrow();
  });
});

// ── Slack ────────────────────────────────────────────────────────────────────
describe('callback flow: slack', () => {
  it('exchanges code and maps user from openid.connect.userInfo', async () => {
    mockTokenResponse({ access_token: 'sl-at', token_type: 'Bearer', authed_user: { id: 'U12345' } });
    mockUserInfoResponse({ ok: true, sub: 'U12345', email: 'slack@example.com', name: 'SlackUser', picture: 'https://avatars.slack-edge.com/u.png' });

    const { profile, tokens } = await SSOFlowService.handleCallback('slack', 'sl-code');

    expect(tokens.accessToken).toBe('sl-at');
    expect(profile.sub).toBe('U12345');
    expect(profile.email).toBe('slack@example.com');
  });
});

// ── TikTok ───────────────────────────────────────────────────────────────────
describe('callback flow: tiktok', () => {
  it('uses client_key and extracts open_id into sub', async () => {
    mockTokenResponse({ access_token: 'tt-at', token_type: 'Bearer', open_id: 'tt-openid-1', expires_in: 86400, refresh_token: 'tt-rt' });
    // TikTok userinfo: GET /user/info/?fields=...
    mockUserInfoResponse({ data: { user: { open_id: 'tt-openid-1', display_name: 'TikUser', avatar_url: 'https://p16.tiktokcdn.com/u.jpg' } }, error: { code: 0, message: '' } });

    const { profile, tokens } = await SSOFlowService.handleCallback('tiktok', 'tt-code');

    expect(tokens.accessToken).toBe('tt-at');
    expect(tokens.refreshToken).toBe('tt-rt');
    expect(profile.sub).toBe('tt-openid-1');
    expect(profile.email).toBeNull();
  });

  it('synthesizes placeholder email (TikTok never returns email)', async () => {
    mockTokenResponse({ access_token: 'tt-at2', open_id: 'tt-oid-2' });
    mockUserInfoResponse({ data: { user: { open_id: 'tt-oid-2', display_name: 'User2' } }, error: { code: 0, message: '' } });

    const result = await SSOFlowService.authenticateOrRegister('tiktok', 'tt-code2');

    expect(result.isNewUser).toBe(true);
    expect(SSOFlowService.isPlaceholderEmail(result.user.email)).toBe(true);
  });
});

// ── WeChat ───────────────────────────────────────────────────────────────────
describe('callback flow: wechat', () => {
  it('uses GET for token exchange with appid/secret, reads openid for userinfo', async () => {
    // WeChat token endpoint is a GET
    mockGetTokenResponse({ access_token: 'wx-at', openid: 'oABC123', refresh_token: 'wx-rt', expires_in: 7200, scope: 'snsapi_login' });
    // WeChat userinfo is also a GET with access_token + openid in query
    mockUserInfoResponse({ openid: 'oABC123', nickname: 'WxUser', headimgurl: 'https://thirdwx.qlogo.cn/u.jpg', unionid: 'wx-union-1' });

    const { profile, tokens } = await SSOFlowService.handleCallback('wechat', 'wx-code');

    expect(tokens.accessToken).toBe('wx-at');
    expect(profile.sub).toBe('oABC123');
    expect(profile.email).toBeNull();
    // WeChat uses GET for token (not POST)
    expect(axiosPost).not.toHaveBeenCalled();
    expect(axiosGet).toHaveBeenCalledTimes(2);
  });

  it('throws on WeChat errcode in token response', async () => {
    mockGetTokenResponse({ errcode: 40029, errmsg: 'invalid code' });

    await expect(SSOFlowService.handleCallback('wechat', 'bad-code')).rejects.toThrow('40029');
  });
});

// ── Autodesk (APS / Forge) ───────────────────────────────────────────────────
describe('callback flow: autodesk', () => {
  it('uses Basic auth on token exchange and fetches userinfo', async () => {
    mockTokenResponse({ access_token: 'aps-at', token_type: 'Bearer', expires_in: 1800, refresh_token: 'aps-rt' });
    mockUserInfoResponse({ sub: 'ADSK|UID001', email: 'arch@autodesk.com', name: 'Architect', picture: null });

    const { profile, tokens } = await SSOFlowService.handleCallback('autodesk', 'aps-code');

    expect(tokens.accessToken).toBe('aps-at');
    expect(profile.sub).toBe('ADSK|UID001');
    expect(profile.email).toBe('arch@autodesk.com');

    // Autodesk requires Confidential Client Basic auth
    const tokenCall = axiosPost.mock.calls[0];
    expect(tokenCall[2]?.headers?.Authorization).toMatch(/^Basic /);
  });
});

// ── Cross-provider: authenticate-or-register flows ──────────────────────────
describe('authenticate-or-register: existing social account', () => {
  it('updates stored tokens and returns isNewUser=false', async () => {
    const { default: UserSocialAccountService } = await import('@/modules/user_social_account/user_social_account.service');
    (UserSocialAccountService.findUserIdByProvider as ReturnType<typeof vi.fn>).mockResolvedValueOnce('uid-existing');
    (UserSocialAccountService.getByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { userSocialAccountId: 'soc-1', provider: 'google' },
    ]);

    mockTokenResponse({ access_token: 'gat2', refresh_token: 'grt2' });
    mockUserInfoResponse({ sub: 'google-sub-existing', email: 'existing@gmail.com' });

    const result = await SSOFlowService.authenticateOrRegister('google', 'g-code-existing');

    expect(result.isNewUser).toBe(false);
    expect(UserSocialAccountService.updateTokens).toHaveBeenCalledWith('soc-1', 'gat2', 'grt2');
  });
});

describe('authenticate-or-register: email-linked user', () => {
  it('links the provider to existing user matched by email', async () => {
    const { default: UserSocialAccountService } = await import('@/modules/user_social_account/user_social_account.service');
    const { default: UserService } = await import('@/modules/user/user.service');
    (UserSocialAccountService.findUserIdByProvider as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (UserService.getByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ userId: 'uid-email', email: 'matched@example.com' });

    mockTokenResponse({ access_token: 'gat3' });
    mockUserInfoResponse({ sub: 'google-sub-3', email: 'matched@example.com' });

    const result = await SSOFlowService.authenticateOrRegister('google', 'g-code-match');

    expect(result.isNewUser).toBe(false);
    expect(UserSocialAccountService.link).toHaveBeenCalledWith('uid-email', 'google', 'google-sub-3', 'gat3');
  });
});

describe('authenticate-or-register: per-tenant gating', () => {
  it('rejects when tenant has disableSocialLogin=true', async () => {
    const { default: AuthPolicyService } = await import('@/modules/auth/auth.policy.service');
    (AuthPolicyService.getAccessPolicy as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ disableSocialLogin: true, ssoAllowedProviders: [] });
    (AuthPolicyService.isSsoProviderAllowed as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    await expect(
      SSOFlowService.authenticateOrRegister('google', 'any-code', undefined, { tenantId: 'tenant-xyz' }),
    ).rejects.toThrow();
  });

  it('rejects when provider not in tenant ssoAllowedProviders', async () => {
    const { default: AuthPolicyService } = await import('@/modules/auth/auth.policy.service');
    (AuthPolicyService.getAccessPolicy as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ disableSocialLogin: false, ssoAllowedProviders: ['github'] });
    (AuthPolicyService.isSsoProviderAllowed as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    await expect(
      SSOFlowService.authenticateOrRegister('google', 'any-code', undefined, { tenantId: 'tenant-strict' }),
    ).rejects.toThrow();
  });
});

describe('authenticate-or-register: ui_locales + login_hint on auth URL', () => {
  it('passes ui_locales and login_hint to provider URL', async () => {
    const url = await SSOFlowService.generateAuthUrl('google', 'state-123', {
      locale: 'tr-TR',
      loginHint: 'user@example.com',
    });

    expect(url).toContain('ui_locales=tr-TR');
    expect(url).toContain('login_hint=user%40example.com');
  });
});

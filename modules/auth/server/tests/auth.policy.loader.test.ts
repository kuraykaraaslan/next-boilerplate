import { describe, it, expect, vi, beforeEach } from 'vitest';

// Env defaults used as the fallback layer for the per-tenant policies.
vi.mock('@nb/env', () => ({
  env: {
    OTP_LENGTH: 6, OTP_EXPIRY_SECONDS: 600, OTP_RATE_LIMIT_SECONDS: 60, OTP_MAX_ATTEMPTS: 5,
    RESET_TOKEN_EXPIRY_SECONDS: 3600, RESET_TOKEN_LENGTH: 6,
    EMAIL_VERIFY_TTL_SECONDS: 86400, EMAIL_VERIFY_RATE_LIMIT_SECONDS: 300,
  },
}));
vi.mock('@nb/logger', () => ({ default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const getByKeys = vi.fn(async (..._args: any[]): Promise<Record<string, string>> => ({}));
vi.mock('@nb/setting/server/setting.service', () => ({ default: { getByKeys: (...a: any[]) => getByKeys(a[0], a[1]) } }));
vi.mock('@nb/tenant/server/tenant.constants', () => ({ ROOT_TENANT_ID: 'root' }));

import AuthPolicyLoaderService from '../auth.policy.loader.service';

beforeEach(() => {
  getByKeys.mockReset();
  getByKeys.mockResolvedValue({});
});

describe('getAccessPolicy — GOODTOHAVE fields', () => {
  it('defaults: registration allowed, verification not required, empty allow-lists', async () => {
    const p = await AuthPolicyLoaderService.getAccessPolicy('t1');
    expect(p.allowRegistration).toBe(true);
    expect(p.emailVerificationRequired).toBe(false);
    expect(p.ssoAllowedProviders).toEqual([]);
    expect(p.mfaAllowedMethods).toEqual([]);
  });

  it('parses CSV ssoAllowedProviders and uppercases/filters mfaAllowedMethods', async () => {
    getByKeys.mockImplementation(async (tenantId: string): Promise<Record<string, string>> => {
      if (tenantId === 't1') {
        return {
          ssoAllowedProviders: 'google, microsoft',
          mfaAllowedMethods: 'totp_app, sms, garbage',
          allowRegistration: 'false',
          emailVerificationRequired: 'true',
        };
      }
      return {};
    });
    const p = await AuthPolicyLoaderService.getAccessPolicy('t1');
    expect(p.ssoAllowedProviders).toEqual(['google', 'microsoft']);
    expect(p.mfaAllowedMethods).toEqual(['TOTP_APP', 'SMS']);
    expect(p.allowRegistration).toBe(false);
    expect(p.emailVerificationRequired).toBe(true);
  });

  it('parses JSON-array ssoAllowedProviders', async () => {
    getByKeys.mockImplementation(async (tenantId: string): Promise<Record<string, string>> =>
      tenantId === 't1' ? { ssoAllowedProviders: '["google","github"]' } : {});
    const p = await AuthPolicyLoaderService.getAccessPolicy('t1');
    expect(p.ssoAllowedProviders).toEqual(['google', 'github']);
  });
});

describe('getOtpPolicy / getResetPolicy / getEmailVerifyPolicy — per-tenant TTLs', () => {
  it('falls back to env defaults when unset', async () => {
    expect(await AuthPolicyLoaderService.getOtpPolicy('t1')).toEqual({
      length: 6, expirySeconds: 600, rateLimitSeconds: 60, maxAttempts: 5,
    });
    expect(await AuthPolicyLoaderService.getResetPolicy('t1')).toEqual({ tokenExpirySeconds: 3600, tokenLength: 6 });
    expect(await AuthPolicyLoaderService.getEmailVerifyPolicy('t1')).toEqual({ ttlSeconds: 86400, rateLimitSeconds: 300 });
  });

  it('honours tenant overrides and clamps reset token length to >= 4', async () => {
    getByKeys.mockImplementation(async (tenantId: string): Promise<Record<string, string>> =>
      tenantId === 't1'
        ? { otpExpirySeconds: '120', otpMaxAttempts: '3', resetTokenLength: '2' }
        : {});
    const otp = await AuthPolicyLoaderService.getOtpPolicy('t1');
    expect(otp.expirySeconds).toBe(120);
    expect(otp.maxAttempts).toBe(3);
    const reset = await AuthPolicyLoaderService.getResetPolicy('t1');
    expect(reset.tokenLength).toBe(4);
  });
});

describe('getCredentialPolicy — GTH-6 bcrypt cost clamp', () => {
  it('defaults to 10', async () => {
    expect(await AuthPolicyLoaderService.getCredentialPolicy('t1')).toEqual({ bcryptCost: 10 });
  });
  it('accepts in-range cost', async () => {
    getByKeys.mockImplementation(async (tenantId: string): Promise<Record<string, string>> => (tenantId === 't1' ? { bcryptCost: '12' } : {}));
    expect((await AuthPolicyLoaderService.getCredentialPolicy('t1')).bcryptCost).toBe(12);
  });
  it('rejects out-of-range cost and falls back to default', async () => {
    getByKeys.mockImplementation(async (tenantId: string): Promise<Record<string, string>> => (tenantId === 't1' ? { bcryptCost: '99' } : {}));
    expect((await AuthPolicyLoaderService.getCredentialPolicy('t1')).bcryptCost).toBe(10);
  });
});

describe('getDormantPolicy / getPasswordPolicy — new fields', () => {
  it('exposes deleteAfterDays (default 0)', async () => {
    expect((await AuthPolicyLoaderService.getDormantPolicy('t1')).deleteAfterDays).toBe(0);
  });
  it('exposes minAgeDays (default 0) and reads override', async () => {
    getByKeys.mockImplementation(async (tenantId: string): Promise<Record<string, string>> =>
      tenantId === 't1' ? { passwordMinAgeDays: '1', dormantDeleteAfterDays: '365' } : {});
    expect((await AuthPolicyLoaderService.getPasswordPolicy('t1')).minAgeDays).toBe(1);
    expect((await AuthPolicyLoaderService.getDormantPolicy('t1')).deleteAfterDays).toBe(365);
  });
});

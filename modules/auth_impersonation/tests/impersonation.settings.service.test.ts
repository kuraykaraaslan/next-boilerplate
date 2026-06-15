import { describe, it, expect, beforeEach } from 'vitest';
import { settingValues, resetImpersonationMocks } from './impersonation.test-setup';
import ImpersonationService from '../impersonation.service';

beforeEach(resetImpersonationMocks);

describe('ImpersonationService.getImpersonationTtlMs (#1)', () => {
  it('falls back to 60 minutes when unset', async () => {
    expect(await ImpersonationService.getImpersonationTtlMs('tenant-1')).toBe(60 * 60 * 1000);
  });

  it('reads the per-tenant setting in minutes', async () => {
    settingValues['impersonationSessionTtlMinutes'] = '15';
    expect(await ImpersonationService.getImpersonationTtlMs('tenant-1')).toBe(15 * 60 * 1000);
  });

  it('clamps below the minimum and falls back on invalid input', async () => {
    settingValues['impersonationSessionTtlMinutes'] = 'not-a-number';
    expect(await ImpersonationService.getImpersonationTtlMs('tenant-1')).toBe(60 * 60 * 1000);
    settingValues['impersonationSessionTtlMinutes'] = '99999';
    expect(await ImpersonationService.getImpersonationTtlMs('tenant-1')).toBe(24 * 60 * 60 * 1000);
  });
});

describe('ImpersonationService.isImpersonationDisabled (#10)', () => {
  it('returns true only when set to "true"', async () => {
    expect(await ImpersonationService.isImpersonationDisabled('tenant-1')).toBe(false);
    settingValues['impersonationDisabled'] = 'true';
    expect(await ImpersonationService.isImpersonationDisabled('tenant-1')).toBe(true);
  });
});

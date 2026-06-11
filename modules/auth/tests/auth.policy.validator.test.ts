import { describe, it, expect } from 'vitest';
import AuthPolicyValidatorService from '../auth.policy.validator.service';
import type { AccessPolicy } from '../auth.policy.loader.service';

function access(partial: Partial<AccessPolicy>): AccessPolicy {
  return {
    externalRequireMfa: false, disableSocialLogin: false,
    captchaTriggerAttempts: 0, singleSessionOnly: false,
    allowRegistration: true, emailVerificationRequired: false,
    ssoAllowedProviders: [], mfaAllowedMethods: [],
    ...partial,
  };
}

describe('isSsoProviderAllowed (GTH-2)', () => {
  it('allows all when the allow-list is empty', () => {
    expect(AuthPolicyValidatorService.isSsoProviderAllowed('google', access({}))).toBe(true);
  });
  it('denies everything when social login is disabled', () => {
    expect(AuthPolicyValidatorService.isSsoProviderAllowed('google', access({ disableSocialLogin: true }))).toBe(false);
  });
  it('restricts to the allow-list, case-insensitively', () => {
    const p = access({ ssoAllowedProviders: ['Google', 'microsoft'] });
    expect(AuthPolicyValidatorService.isSsoProviderAllowed('google', p)).toBe(true);
    expect(AuthPolicyValidatorService.isSsoProviderAllowed('github', p)).toBe(false);
  });
  it('filterAllowedProviders narrows a list', () => {
    const p = access({ ssoAllowedProviders: ['google'] });
    expect(AuthPolicyValidatorService.filterAllowedProviders(['google', 'github', 'apple'], p)).toEqual(['google']);
  });
});

describe('isMfaMethodAllowed (GTH-13)', () => {
  it('allows all when the allow-list is empty', () => {
    expect(AuthPolicyValidatorService.isMfaMethodAllowed('SMS', access({}))).toBe(true);
  });
  it('bans methods outside the allow-list', () => {
    const p = access({ mfaAllowedMethods: ['TOTP_APP', 'EMAIL'] });
    expect(AuthPolicyValidatorService.isMfaMethodAllowed('TOTP_APP', p)).toBe(true);
    expect(AuthPolicyValidatorService.isMfaMethodAllowed('SMS', p)).toBe(false);
  });
});

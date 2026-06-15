import { describe, it, expect } from 'vitest';
import './tenant_invitation.test-setup';
import TenantInvitationService from '../tenant_invitation.service';

describe('TenantInvitationService.hashToken', () => {
  it('returns a 64-character hex string', () => {
    const hash = TenantInvitationService.hashToken('some-raw-token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same hash for the same input', () => {
    const token = 'consistent-token';
    expect(TenantInvitationService.hashToken(token)).toBe(TenantInvitationService.hashToken(token));
  });

  it('produces different hashes for different inputs', () => {
    expect(TenantInvitationService.hashToken('token-a')).not.toBe(TenantInvitationService.hashToken('token-b'));
  });
});

describe('TenantInvitationService.generateRawToken', () => {
  it('returns a 64-character hex string', () => {
    const token = TenantInvitationService.generateRawToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates unique tokens each call', () => {
    expect(TenantInvitationService.generateRawToken()).not.toBe(TenantInvitationService.generateRawToken());
  });
});

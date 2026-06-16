import { describe, it, expect } from 'vitest';
import {
  StartSystemImpersonationDTO,
  StartTenantImpersonationDTO,
  StepUpCredentialDTO,
} from '../impersonation.dto';

const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const REASON = 'Customer support ticket #1234';

describe('StartSystemImpersonationDTO', () => {
  it('accepts valid targetUserId, tenantId and reason', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      reason: REASON,
    });
    expect(result.success).toBe(true);
  });

  it('accepts with optional targetTenantRole', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      reason: REASON,
      targetTenantRole: 'USER',
    });
    expect(result.success).toBe(true);
  });

  it('accepts ADMIN as targetTenantRole', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      reason: REASON,
      targetTenantRole: 'ADMIN',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional stepUp credential (password)', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      reason: REASON,
      stepUp: { password: 'hunter2' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects when reason is missing', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when reason is too short', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      reason: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID targetUserId', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: 'not-a-uuid',
      tenantId: validUuid,
      reason: REASON,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID tenantId', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: 'not-a-uuid',
      reason: REASON,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when targetUserId is missing', () => {
    const result = StartSystemImpersonationDTO.safeParse({ tenantId: validUuid, reason: REASON });
    expect(result.success).toBe(false);
  });

  it('rejects when tenantId is missing', () => {
    const result = StartSystemImpersonationDTO.safeParse({ targetUserId: validUuid, reason: REASON });
    expect(result.success).toBe(false);
  });

  it('rejects invalid targetTenantRole', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      reason: REASON,
      targetTenantRole: 'SUPERUSER',
    });
    expect(result.success).toBe(false);
  });
});

describe('StartTenantImpersonationDTO', () => {
  it('accepts valid targetUserId and reason', () => {
    const result = StartTenantImpersonationDTO.safeParse({ targetUserId: validUuid, reason: REASON });
    expect(result.success).toBe(true);
  });

  it('rejects when reason is missing', () => {
    const result = StartTenantImpersonationDTO.safeParse({ targetUserId: validUuid });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID targetUserId', () => {
    const result = StartTenantImpersonationDTO.safeParse({ targetUserId: 'not-a-uuid', reason: REASON });
    expect(result.success).toBe(false);
  });

  it('rejects when targetUserId is missing', () => {
    const result = StartTenantImpersonationDTO.safeParse({ reason: REASON });
    expect(result.success).toBe(false);
  });
});

describe('StepUpCredentialDTO', () => {
  it('accepts a password-only credential', () => {
    expect(StepUpCredentialDTO.safeParse({ password: 'pw' }).success).toBe(true);
  });

  it('accepts a totp-only credential', () => {
    expect(StepUpCredentialDTO.safeParse({ totp: '123456' }).success).toBe(true);
  });

  it('rejects an empty credential', () => {
    expect(StepUpCredentialDTO.safeParse({}).success).toBe(false);
  });
});

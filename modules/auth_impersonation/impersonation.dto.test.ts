import { describe, it, expect } from 'vitest';
import { StartSystemImpersonationDTO, StartTenantImpersonationDTO } from './impersonation.dto';

const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('StartSystemImpersonationDTO', () => {
  it('accepts valid targetUserId and tenantId', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('accepts with optional targetTenantRole', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      targetTenantRole: 'USER',
    });
    expect(result.success).toBe(true);
  });

  it('accepts ADMIN as targetTenantRole', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      targetTenantRole: 'ADMIN',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID targetUserId', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: 'not-a-uuid',
      tenantId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID tenantId', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when targetUserId is missing', () => {
    const result = StartSystemImpersonationDTO.safeParse({ tenantId: validUuid });
    expect(result.success).toBe(false);
  });

  it('rejects when tenantId is missing', () => {
    const result = StartSystemImpersonationDTO.safeParse({ targetUserId: validUuid });
    expect(result.success).toBe(false);
  });

  it('rejects invalid targetTenantRole', () => {
    const result = StartSystemImpersonationDTO.safeParse({
      targetUserId: validUuid,
      tenantId: validUuid,
      targetTenantRole: 'SUPERUSER',
    });
    expect(result.success).toBe(false);
  });
});

describe('StartTenantImpersonationDTO', () => {
  it('accepts valid targetUserId', () => {
    const result = StartTenantImpersonationDTO.safeParse({ targetUserId: validUuid });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID targetUserId', () => {
    const result = StartTenantImpersonationDTO.safeParse({ targetUserId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects when targetUserId is missing', () => {
    const result = StartTenantImpersonationDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

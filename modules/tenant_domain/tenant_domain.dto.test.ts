import { describe, it, expect } from 'vitest';
import {
  CreateTenantDomainDTO,
  UpdateTenantDomainDTO,
  GetTenantDomainsDTO,
  InitiateVerificationDTO,
  VerifyDomainDTO,
} from './tenant_domain.dto';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateTenantDomainDTO', () => {
  it('accepts valid domain creation input', () => {
    const result = CreateTenantDomainDTO.safeParse({
      tenantId: VALID_UUID,
      domain: 'example.com',
      isPrimary: false,
    });
    expect(result.success).toBe(true);
  });

  it('defaults isPrimary to false when omitted', () => {
    const result = CreateTenantDomainDTO.safeParse({
      tenantId: VALID_UUID,
      domain: 'example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPrimary).toBe(false);
  });

  it('rejects non-UUID tenantId', () => {
    const result = CreateTenantDomainDTO.safeParse({ tenantId: 'not-a-uuid', domain: 'example.com' });
    expect(result.success).toBe(false);
  });

  it('rejects empty domain', () => {
    const result = CreateTenantDomainDTO.safeParse({ tenantId: VALID_UUID, domain: '' });
    expect(result.success).toBe(false);
  });

  it('rejects domain longer than 255 characters', () => {
    const result = CreateTenantDomainDTO.safeParse({ tenantId: VALID_UUID, domain: 'a'.repeat(256) + '.com' });
    expect(result.success).toBe(false);
  });

  it('accepts domain at max boundary of 255 characters', () => {
    const result = CreateTenantDomainDTO.safeParse({ tenantId: VALID_UUID, domain: 'a'.repeat(251) + '.com' });
    expect(result.success).toBe(true);
  });

  it('rejects missing tenantId', () => {
    const result = CreateTenantDomainDTO.safeParse({ domain: 'example.com' });
    expect(result.success).toBe(false);
  });
});

describe('UpdateTenantDomainDTO', () => {
  it('accepts empty update object', () => {
    const result = UpdateTenantDomainDTO.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts isPrimary true', () => {
    const result = UpdateTenantDomainDTO.safeParse({ isPrimary: true });
    expect(result.success).toBe(true);
  });

  it('accepts valid domainStatus', () => {
    const result = UpdateTenantDomainDTO.safeParse({ domainStatus: 'ACTIVE' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid domainStatus', () => {
    const result = UpdateTenantDomainDTO.safeParse({ domainStatus: 'BROKEN' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid status values', () => {
    for (const status of ['ACTIVE', 'INACTIVE', 'PENDING', 'VERIFIED']) {
      expect(UpdateTenantDomainDTO.safeParse({ domainStatus: status }).success).toBe(true);
    }
  });
});

describe('GetTenantDomainsDTO', () => {
  it('accepts valid tenantId with defaults', () => {
    const result = GetTenantDomainsDTO.safeParse({ tenantId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('accepts explicit page and pageSize', () => {
    const result = GetTenantDomainsDTO.safeParse({ tenantId: VALID_UUID, page: 3, pageSize: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(25);
    }
  });

  it('rejects invalid tenantId', () => {
    const result = GetTenantDomainsDTO.safeParse({ tenantId: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects missing tenantId', () => {
    const result = GetTenantDomainsDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('InitiateVerificationDTO', () => {
  it('accepts valid tenantDomainId with default TXT method', () => {
    const result = InitiateVerificationDTO.safeParse({ tenantDomainId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.method).toBe('TXT');
  });

  it('accepts CNAME method', () => {
    const result = InitiateVerificationDTO.safeParse({ tenantDomainId: VALID_UUID, method: 'CNAME' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.method).toBe('CNAME');
  });

  it('rejects invalid verification method', () => {
    const result = InitiateVerificationDTO.safeParse({ tenantDomainId: VALID_UUID, method: 'MX' });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID tenantDomainId', () => {
    const result = InitiateVerificationDTO.safeParse({ tenantDomainId: 'not-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('VerifyDomainDTO', () => {
  it('accepts valid tenantDomainId', () => {
    const result = VerifyDomainDTO.safeParse({ tenantDomainId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID tenantDomainId', () => {
    const result = VerifyDomainDTO.safeParse({ tenantDomainId: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing tenantDomainId', () => {
    const result = VerifyDomainDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

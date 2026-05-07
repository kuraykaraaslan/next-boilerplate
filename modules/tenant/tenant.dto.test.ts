import { describe, it, expect } from 'vitest';
import { CreateTenantDTO, UpdateTenantDTO, GetTenantDTO, GetTenantsDTO } from './tenant.dto';

describe('CreateTenantDTO', () => {
  it('accepts valid data with required fields', () => {
    const result = CreateTenantDTO.safeParse({ name: 'Acme Corp', description: null });
    expect(result.success).toBe(true);
  });

  it('applies default region of TR', () => {
    const result = CreateTenantDTO.safeParse({ name: 'Acme Corp', description: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.region).toBe('TR');
  });

  it('accepts explicit region', () => {
    const result = CreateTenantDTO.safeParse({ name: 'Acme Corp', description: 'desc', region: 'EU' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.region).toBe('EU');
  });

  it('rejects empty name', () => {
    const result = CreateTenantDTO.safeParse({ name: '', description: null });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const result = CreateTenantDTO.safeParse({ name: 'a'.repeat(101), description: null });
    expect(result.success).toBe(false);
  });

  it('accepts name at max boundary of 100 characters', () => {
    const result = CreateTenantDTO.safeParse({ name: 'a'.repeat(100), description: null });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = CreateTenantDTO.safeParse({ description: null });
    expect(result.success).toBe(false);
  });
});

describe('UpdateTenantDTO', () => {
  it('accepts all optional fields absent', () => {
    const result = UpdateTenantDTO.safeParse({ description: null, region: null });
    expect(result.success).toBe(true);
  });

  it('accepts valid partial update with name', () => {
    const result = UpdateTenantDTO.safeParse({ name: 'New Name', description: null, region: null });
    expect(result.success).toBe(true);
  });

  it('rejects empty name when provided', () => {
    const result = UpdateTenantDTO.safeParse({ name: '', description: null, region: null });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 characters when provided', () => {
    const result = UpdateTenantDTO.safeParse({ name: 'x'.repeat(101), description: null, region: null });
    expect(result.success).toBe(false);
  });

  it('accepts valid tenantStatus', () => {
    const result = UpdateTenantDTO.safeParse({ description: null, region: null, tenantStatus: 'INACTIVE' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid tenantStatus', () => {
    const result = UpdateTenantDTO.safeParse({ description: null, region: null, tenantStatus: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });
});

describe('GetTenantDTO', () => {
  it('accepts valid UUID tenantId', () => {
    const result = GetTenantDTO.safeParse({ tenantId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects null tenantId (refinement fails)', () => {
    const result = GetTenantDTO.safeParse({ tenantId: null });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID tenantId', () => {
    const result = GetTenantDTO.safeParse({ tenantId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing tenantId', () => {
    const result = GetTenantDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('GetTenantsDTO', () => {
  it('accepts valid input with defaults', () => {
    const result = GetTenantsDTO.safeParse({ search: null, tenantId: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('accepts explicit page and pageSize', () => {
    const result = GetTenantsDTO.safeParse({ page: 2, pageSize: 20, search: 'acme', tenantId: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('accepts valid tenantId UUID filter', () => {
    const result = GetTenantsDTO.safeParse({ search: null, tenantId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID tenantId', () => {
    const result = GetTenantsDTO.safeParse({ search: null, tenantId: 'bad-id' });
    expect(result.success).toBe(false);
  });
});

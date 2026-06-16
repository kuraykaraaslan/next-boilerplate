import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TENANT_ID, INVITATION_ID, makeRepo, mockTenantDs, mockDefaultDs,
} from './tenant_invitation.test-setup';
import TenantInvitationService from '../tenant_invitation.service';
import TenantInvitationMessages from '../tenant_invitation.messages';

beforeEach(() => vi.clearAllMocks());

describe('TenantInvitationService.getByTenantId', () => {
  it('returns invitations and total', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    const result = await TenantInvitationService.getByTenantId({ tenantId: TENANT_ID, page: 1, pageSize: 10, status: null });
    expect(result.invitations).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('filters by status when provided', async () => {
    const repo = makeRepo({ find: vi.fn(async () => []), count: vi.fn(async () => 0) });
    mockTenantDs(repo);

    const result = await TenantInvitationService.getByTenantId({ tenantId: TENANT_ID, page: 1, pageSize: 10, status: 'ACCEPTED' });
    expect(result.total).toBe(0);
  });

  it('enforces minimum page of 1', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    const result = await TenantInvitationService.getByTenantId({ tenantId: TENANT_ID, page: 0, pageSize: 10, status: null });
    expect(result.invitations).toBeDefined();
  });
});

describe('TenantInvitationService.getById', () => {
  it('returns invitation when found', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    const result = await TenantInvitationService.getById(INVITATION_ID, TENANT_ID);
    expect(result.invitationId).toBe(INVITATION_ID);
    expect((result as any).token).toBeUndefined();
  });

  it('throws INVITATION_NOT_FOUND when not found', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(TenantInvitationService.getById(INVITATION_ID, TENANT_ID)).rejects.toThrow(
      TenantInvitationMessages.INVITATION_NOT_FOUND
    );
  });
});

describe('TenantInvitationService.getByToken', () => {
  it('throws INVITATION_INVALID_TOKEN when not found', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(TenantInvitationService.getByToken('bad-token')).rejects.toThrow(
      TenantInvitationMessages.INVITATION_INVALID_TOKEN
    );
  });

  it('returns invitation when token is valid', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantInvitationService.getByToken('any-raw-token');
    expect(result.invitationId).toBe(INVITATION_ID);
  });
});

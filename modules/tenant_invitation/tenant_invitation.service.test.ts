import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    INVITATION_TTL_SECONDS: 604800,
  },
}));

vi.mock('@/modules/db', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  getDefaultTenantDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/modules/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('../tenant_member/tenant_member.service', () => ({
  default: {
    getByTenantAndUser: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
  },
}));

import { getSystemDataSource, tenantDataSourceFor, getDefaultTenantDataSource } from '@/modules/db';
import TenantInvitationService from './tenant_invitation.service';
import TenantInvitationMessages from './tenant_invitation.messages';
import TenantMemberService from '../tenant_member/tenant_member.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const INVITATION_ID = '550e8400-e29b-41d4-a716-446655440003';

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 1000);

const mockInvitation = {
  invitationId: INVITATION_ID,
  tenantId: TENANT_ID,
  email: 'invitee@example.com',
  invitedByUserId: USER_ID,
  memberRole: 'USER' as const,
  token: 'hashed-token',
  status: 'PENDING' as const,
  expiresAt: futureDate,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepo(overrides: Partial<{
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    findOne: vi.fn(async () => mockInvitation),
    find: vi.fn(async () => [mockInvitation]),
    count: vi.fn(async () => 1),
    create: vi.fn((data: any) => ({ ...mockInvitation, ...data })),
    save: vi.fn(async (entity: any) => ({ ...mockInvitation, ...entity })),
    update: vi.fn(async () => ({ affected: 1 })),
    ...overrides,
  };
}

function mockTenantDs(repo: ReturnType<typeof makeRepo>) {
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
}

function mockDefaultDs(repo: ReturnType<typeof makeRepo>) {
  (getDefaultTenantDataSource as any).mockResolvedValue({ getRepository: () => repo });
}

function mockSystemDs(userRepo: ReturnType<typeof vi.fn>) {
  (getSystemDataSource as any).mockResolvedValue({ getRepository: () => ({ findOne: userRepo }) });
}

beforeEach(() => vi.clearAllMocks());

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
    mockDefaultDs(repo);

    const result = await TenantInvitationService.getById(INVITATION_ID);
    expect(result.invitationId).toBe(INVITATION_ID);
    expect((result as any).token).toBeUndefined();
  });

  it('throws INVITATION_NOT_FOUND when not found', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(TenantInvitationService.getById(INVITATION_ID)).rejects.toThrow(
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

describe('TenantInvitationService.send', () => {
  it('creates and returns an invitation with raw token', async () => {
    const userFindOne = vi.fn(async () => null);
    mockSystemDs(userFindOne);
    const repo = makeRepo();
    mockTenantDs(repo);

    const result = await TenantInvitationService.send(TENANT_ID, USER_ID, { email: 'new@example.com', memberRole: 'USER' });
    expect(result.invitation.tenantId).toBe(TENANT_ID);
    expect(result.rawToken).toBeDefined();
    expect(result.rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect((result.invitation as any).token).toBeUndefined();
  });

  it('throws INVITATION_ALREADY_MEMBER when user is already a member', async () => {
    const existingUser = { userId: USER_ID, email: 'invitee@example.com' };
    const userFindOne = vi.fn(async () => existingUser);
    mockSystemDs(userFindOne);
    (TenantMemberService.getByTenantAndUser as any).mockResolvedValueOnce({ tenantMemberId: 'existing-member' });

    await expect(
      TenantInvitationService.send(TENANT_ID, USER_ID, { email: 'invitee@example.com', memberRole: 'USER' })
    ).rejects.toThrow(TenantInvitationMessages.INVITATION_ALREADY_MEMBER);
  });

  it('normalizes email to lowercase before sending', async () => {
    const userFindOne = vi.fn(async () => null);
    mockSystemDs(userFindOne);
    const repo = makeRepo();
    mockTenantDs(repo);

    await TenantInvitationService.send(TENANT_ID, USER_ID, { email: 'UPPER@EXAMPLE.COM', memberRole: 'USER' });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'upper@example.com' })
    );
  });

  it('revokes existing pending invitations for the same email before sending', async () => {
    const userFindOne = vi.fn(async () => null);
    mockSystemDs(userFindOne);
    const repo = makeRepo();
    mockTenantDs(repo);

    await TenantInvitationService.send(TENANT_ID, USER_ID, { email: 'invitee@example.com', memberRole: 'USER' });
    expect(repo.update).toHaveBeenCalledWith(
      { tenantId: TENANT_ID, email: 'invitee@example.com', status: 'PENDING' },
      { status: 'REVOKED' }
    );
  });
});

describe('TenantInvitationService.accept', () => {
  it('accepts a valid invitation and creates a tenant member', async () => {
    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const invitation = { ...mockInvitation, token: hashedToken, email: 'invitee@example.com' };
    const repo = makeRepo({ findOne: vi.fn(async () => invitation) });
    mockTenantDs(repo);

    await TenantInvitationService.accept(TENANT_ID, USER_ID, 'invitee@example.com', rawToken);
    expect(TenantMemberService.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, userId: USER_ID, memberRole: 'USER', memberStatus: 'ACTIVE' })
    );
    expect(repo.update).toHaveBeenCalledWith(
      { invitationId: INVITATION_ID },
      { status: 'ACCEPTED' }
    );
  });

  it('throws INVITATION_INVALID_TOKEN when token not found', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(
      TenantInvitationService.accept(TENANT_ID, USER_ID, 'invitee@example.com', 'badtoken')
    ).rejects.toThrow(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
  });

  it('throws INVITATION_EMAIL_MISMATCH when email does not match', async () => {
    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const invitation = { ...mockInvitation, token: hashedToken, email: 'invitee@example.com' };
    const repo = makeRepo({ findOne: vi.fn(async () => invitation) });
    mockTenantDs(repo);

    await expect(
      TenantInvitationService.accept(TENANT_ID, USER_ID, 'wrong@example.com', rawToken)
    ).rejects.toThrow(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH);
  });

  it('throws INVITATION_EXPIRED when invitation is past expiry', async () => {
    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const expiredInvitation = { ...mockInvitation, token: hashedToken, expiresAt: pastDate };
    const repo = makeRepo({ findOne: vi.fn(async () => expiredInvitation) });
    mockTenantDs(repo);

    await expect(
      TenantInvitationService.accept(TENANT_ID, USER_ID, 'invitee@example.com', rawToken)
    ).rejects.toThrow(TenantInvitationMessages.INVITATION_EXPIRED);
  });

  it('throws INVITATION_ALREADY_ACCEPTED for already accepted invitation', async () => {
    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const acceptedInvitation = { ...mockInvitation, token: hashedToken, status: 'ACCEPTED' as const };
    const repo = makeRepo({ findOne: vi.fn(async () => acceptedInvitation) });
    mockTenantDs(repo);

    await expect(
      TenantInvitationService.accept(TENANT_ID, USER_ID, 'invitee@example.com', rawToken)
    ).rejects.toThrow(TenantInvitationMessages.INVITATION_ALREADY_ACCEPTED);
  });
});

describe('TenantInvitationService.decline', () => {
  it('declines a valid invitation', async () => {
    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const invitation = { ...mockInvitation, token: hashedToken, email: 'invitee@example.com' };
    const repo = makeRepo({ findOne: vi.fn(async () => invitation) });
    mockTenantDs(repo);

    await TenantInvitationService.decline(TENANT_ID, 'invitee@example.com', rawToken);
    expect(repo.update).toHaveBeenCalledWith(
      { invitationId: INVITATION_ID },
      { status: 'DECLINED' }
    );
  });

  it('throws INVITATION_INVALID_TOKEN when token not found', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(
      TenantInvitationService.decline(TENANT_ID, 'invitee@example.com', 'badtoken')
    ).rejects.toThrow(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
  });

  it('throws INVITATION_REVOKED for a revoked invitation', async () => {
    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const revokedInvitation = { ...mockInvitation, token: hashedToken, status: 'REVOKED' as const };
    const repo = makeRepo({ findOne: vi.fn(async () => revokedInvitation) });
    mockTenantDs(repo);

    await expect(
      TenantInvitationService.decline(TENANT_ID, 'invitee@example.com', rawToken)
    ).rejects.toThrow(TenantInvitationMessages.INVITATION_REVOKED);
  });
});

describe('TenantInvitationService.revoke', () => {
  it('revokes a pending invitation', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    await TenantInvitationService.revoke(INVITATION_ID, TENANT_ID);
    expect(repo.update).toHaveBeenCalledWith({ invitationId: INVITATION_ID }, { status: 'REVOKED' });
  });

  it('throws INVITATION_NOT_FOUND when invitation does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(TenantInvitationService.revoke(INVITATION_ID, TENANT_ID)).rejects.toThrow(
      TenantInvitationMessages.INVITATION_NOT_FOUND
    );
  });

  it('throws INVITATION_NOT_FOUND when invitation is not PENDING', async () => {
    const acceptedInvitation = { ...mockInvitation, status: 'ACCEPTED' as const };
    const repo = makeRepo({ findOne: vi.fn(async () => acceptedInvitation) });
    mockTenantDs(repo);

    await expect(TenantInvitationService.revoke(INVITATION_ID, TENANT_ID)).rejects.toThrow(
      TenantInvitationMessages.INVITATION_NOT_FOUND
    );
  });
});

describe('TenantInvitationService.autoAcceptForEmail', () => {
  it('accepts all pending non-expired invitations for an email', async () => {
    const repo = makeRepo({ find: vi.fn(async () => [mockInvitation]) });
    mockDefaultDs(repo);
    mockTenantDs(repo);

    await TenantInvitationService.autoAcceptForEmail(USER_ID, 'invitee@example.com');
    expect(TenantMemberService.create).toHaveBeenCalled();
  });

  it('skips membership creation if already a member', async () => {
    const repo = makeRepo({ find: vi.fn(async () => [mockInvitation]) });
    mockDefaultDs(repo);
    mockTenantDs(repo);
    (TenantMemberService.getByTenantAndUser as any).mockResolvedValue({ tenantMemberId: 'existing' });

    await TenantInvitationService.autoAcceptForEmail(USER_ID, 'invitee@example.com');
    expect(TenantMemberService.create).not.toHaveBeenCalled();
  });

  it('does nothing when there are no pending invitations', async () => {
    const repo = makeRepo({ find: vi.fn(async () => []) });
    mockDefaultDs(repo);

    await TenantInvitationService.autoAcceptForEmail(USER_ID, 'noone@example.com');
    expect(TenantMemberService.create).not.toHaveBeenCalled();
  });
});

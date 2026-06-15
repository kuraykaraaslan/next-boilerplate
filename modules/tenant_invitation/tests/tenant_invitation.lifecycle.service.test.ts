import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TENANT_ID, USER_ID, INVITATION_ID, mockInvitation, pastDate,
  makeRepo, mockTenantDs, mockSystemDs,
} from './tenant_invitation.test-setup';
import TenantInvitationService from '../tenant_invitation.service';
import TenantInvitationMessages from '../tenant_invitation.messages';
import TenantMemberService from '../../tenant_member/tenant_member.service';

beforeEach(() => vi.clearAllMocks());

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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TENANT_ID, USER_ID, INVITATION_ID, mockInvitation,
  makeRepo, mockTenantDs, mockDefaultDs,
} from './tenant_invitation.test-setup';
import TenantInvitationService from '../tenant_invitation.service';
import TenantInvitationMessages from '../tenant_invitation.messages';
import TenantMemberService from '../../tenant_member/tenant_member.service';

beforeEach(() => vi.clearAllMocks());

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

  it('throws INVITATION_ONLY_PENDING_CAN_BE_REVOKED when invitation is not PENDING', async () => {
    const acceptedInvitation = { ...mockInvitation, status: 'ACCEPTED' as const };
    const repo = makeRepo({ findOne: vi.fn(async () => acceptedInvitation) });
    mockTenantDs(repo);

    await expect(TenantInvitationService.revoke(INVITATION_ID, TENANT_ID)).rejects.toThrow(
      TenantInvitationMessages.INVITATION_ONLY_PENDING_CAN_BE_REVOKED
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

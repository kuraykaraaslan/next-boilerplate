'use client';
import { use, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faBan, faPlus } from '@fortawesome/free-solid-svg-icons';

type MemberRole = 'USER' | 'ADMIN' | 'OWNER';

type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';

type Invitation = {
  invitationId: string;
  tenantId: string;
  email: string;
  invitedByUserId: string;
  memberRole: MemberRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type SessionData = {
  tenantMember: { tenantMemberId: string; memberRole: MemberRole };
  tenant: { name: string };
};

const STATUS_BADGE: Record<InvitationStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
  PENDING:  'warning',
  ACCEPTED: 'success',
  DECLINED: 'error',
  EXPIRED:  'neutral',
  REVOKED:  'neutral',
};

const ROLE_BADGE: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'primary',
  ADMIN: 'warning',
  USER:  'neutral',
};

const selectClass =
  'h-9 rounded-lg border border-border bg-surface-base px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus w-full';

export default function TenantInvitationsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [confirmRevoke, setConfirmRevoke] = useState<Invitation | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('USER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/invitations`, { params: { status: 'PENDING', pageSize: 100 } }),
    ])
      .then(([sessionRes, invitationsRes]) => {
        setSession(sessionRes.data);
        setInvitations(invitationsRes.data.invitations ?? []);
      })
      .catch((err: any) => {
        setFetchError(err.response?.data?.message ?? err.message ?? 'Failed to load invitations. Please refresh.');
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const canManage =
    session?.tenantMember.memberRole === 'ADMIN' ||
    session?.tenantMember.memberRole === 'OWNER';

  async function handleRevoke() {
    if (!confirmRevoke) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/invitations/${confirmRevoke.invitationId}`);
      setInvitations((prev) => prev.filter((inv) => inv.invitationId !== confirmRevoke.invitationId));
      setConfirmRevoke(null);
    } catch (err: any) {
      setRevokeError(err.response?.data?.message ?? err.message ?? 'Failed to revoke invitation.');
    } finally {
      setRevoking(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/invitations`, {
        email: inviteEmail.trim(),
        memberRole: inviteRole,
      });
      const created: Invitation = res.data.invitation;
      setInvitations((prev) => [created, ...prev]);
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('USER');
    } catch (err: any) {
      setInviteError(err.response?.data?.message ?? err.message ?? 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  }

  function closeInvite() {
    setShowInvite(false);
    setInviteEmail('');
    setInviteRole('USER');
    setInviteError('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        subtitle="Pending invitations sent to new members"
        actions={canManage ? [{ label: 'New Invitation', onClick: () => setShowInvite(true) }] : []}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <Card title="Pending Invitations" subtitle="Invitations that have been sent but not yet accepted">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : invitations.length === 0 ? (
          <EmptyState
            icon={<FontAwesomeIcon icon={faEnvelope} className="w-5 h-5" />}
            title="No pending invitations"
            description="Invite new members to join this organization."
            action={canManage ? (
              <Button onClick={() => setShowInvite(true)} iconLeft={<FontAwesomeIcon icon={faPlus} />}>
                New Invitation
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Sent</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Expires</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  {canManage && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitations.map((invitation) => (
                  <tr key={invitation.invitationId} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary text-xs font-semibold shrink-0">
                          <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />
                        </span>
                        <p className="font-medium text-text-primary truncate">{invitation.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={ROLE_BADGE[invitation.memberRole]}>{invitation.memberRole}</Badge>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_BADGE[invitation.status]}>{invitation.status}</Badge>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label="Revoke invitation"
                          onClick={() => setConfirmRevoke(invitation)}
                          iconLeft={<FontAwesomeIcon icon={faBan} className="text-error" />}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={showInvite}
        onClose={closeInvite}
        title="New Invitation"
        description="Send an invitation email to add someone to this organization."
        footer={
          <>
            <Button variant="ghost" onClick={closeInvite} disabled={inviting}>Cancel</Button>
            <Button form="invite-form" type="submit" loading={inviting} iconLeft={<FontAwesomeIcon icon={faEnvelope} />}>
              Send Invitation
            </Button>
          </>
        }
      >
        <form id="invite-form" onSubmit={handleInvite} className="space-y-4">
          {inviteError && <AlertBanner variant="error" message={inviteError} />}
          <Input
            id="inv-email"
            label="Email address"
            type="email"
            required
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="inv-role" className="text-xs font-medium text-text-secondary">Role</label>
            <select
              id="inv-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className={selectClass}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              {session?.tenantMember.memberRole === 'OWNER' && (
                <option value="OWNER">Owner</option>
              )}
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmRevoke !== null}
        onClose={() => { setConfirmRevoke(null); setRevokeError(''); }}
        title="Revoke Invitation"
        description={`Revoke the invitation sent to ${confirmRevoke?.email}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRevoke(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="danger" loading={revoking} onClick={handleRevoke}>
              Revoke
            </Button>
          </>
        }
      >
        {revokeError && <AlertBanner variant="error" message={revokeError} />}
        <p className="text-sm text-text-secondary">
          This will immediately invalidate the invitation link. The recipient will no longer be able to accept it.
        </p>
      </Modal>
    </div>
  );
}

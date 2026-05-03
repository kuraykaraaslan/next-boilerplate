'use client';
import { use, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Spinner } from '@/modules/ui/Spinner';
import { Modal } from '@/modules/ui/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faBan } from '@fortawesome/free-solid-svg-icons';

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
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'error',
  EXPIRED: 'neutral',
  REVOKED: 'neutral',
};

const ROLE_BADGE: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'primary',
  ADMIN: 'warning',
  USER: 'neutral',
};

export default function TenantInvitationsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [confirmRevoke, setConfirmRevoke] = useState<Invitation | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Invitations</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {loading ? '…' : `${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <Card title="Pending Invitations" subtitle="Invitations that have been sent but not yet accepted">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
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
                {invitations.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="px-6 py-10 text-center text-sm text-text-secondary"
                    >
                      No pending invitations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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

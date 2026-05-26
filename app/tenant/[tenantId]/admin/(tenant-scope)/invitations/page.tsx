'use client';
import { use, useEffect, useState, useMemo } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faBan } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole } from '@/modules/tenant_member/tenant_member.enums';
import type { TenantInvitationStatus as InvitationStatus } from '@/modules/tenant_invitation/tenant_invitation.enums';

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

const PAGE_SIZE = 25;

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

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function TenantInvitationsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [session, setSession]         = useState<SessionData | null>(null);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');

  const [confirmRevoke, setConfirmRevoke] = useState<Invitation | null>(null);
  const [revoking, setRevoking]           = useState(false);
  const [revokeError, setRevokeError]     = useState('');

  const [showInvite, setShowInvite]   = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<MemberRole>('USER');
  const [inviting, setInviting]       = useState(false);
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
      .catch((err) => setFetchError(extractMessage(err, 'Failed to load invitations.')))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const canManage =
    session?.tenantMember.memberRole === 'ADMIN' ||
    session?.tenantMember.memberRole === 'OWNER';

  const roleOptions = useMemo(() => {
    const base = [
      { value: 'USER',  label: 'User'  },
      { value: 'ADMIN', label: 'Admin' },
    ];
    if (session?.tenantMember.memberRole === 'OWNER') {
      base.push({ value: 'OWNER', label: 'Owner' });
    }
    return base;
  }, [session?.tenantMember.memberRole]);

  const total = invitations.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = invitations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleRevoke() {
    if (!confirmRevoke) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/invitations/${confirmRevoke.invitationId}`);
      setInvitations((prev) => prev.filter((inv) => inv.invitationId !== confirmRevoke.invitationId));
      setConfirmRevoke(null);
      toast.success('Invitation revoked.');
    } catch (err: unknown) {
      setRevokeError(extractMessage(err, 'Failed to revoke invitation.'));
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
      toast.success('Invitation sent.');
    } catch (err: unknown) {
      setInviteError(extractMessage(err, 'Failed to send invitation.'));
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

  const columns: TableColumn<Invitation>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (inv) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />
          </span>
          <p className="font-medium text-text-primary truncate">{inv.email}</p>
        </div>
      ),
    },
    {
      key: 'memberRole',
      header: 'Role',
      render: (inv) => <Badge variant={ROLE_BADGE[inv.memberRole]}>{inv.memberRole}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Sent',
      render: (inv) => (
        <span className="text-text-secondary">{new Date(inv.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (inv) => (
        <span className="text-text-secondary">{new Date(inv.expiresAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => <Badge variant={STATUS_BADGE[inv.status]}>{inv.status}</Badge>,
    },
  ];

  if (canManage) {
    columns.push({
      key: '_actions',
      header: '',
      align: 'right',
      render: (inv) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'Revoke',
                icon: <FontAwesomeIcon icon={faBan} />,
                onClick: () => { setConfirmRevoke(inv); setRevokeError(''); },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        subtitle="Pending invitations sent to new members"
        actions={canManage ? [{ label: 'New Invitation', onClick: () => setShowInvite(true) }] : []}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(inv) => inv.invitationId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No pending invitations."
        title="Pending Invitations"
        subtitle="Invitations that have been sent but not yet accepted"
      />

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
          <Select
            id="inv-role"
            label="Role"
            options={roleOptions}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as MemberRole)}
          />
        </form>
      </Modal>

      <Modal
        open={confirmRevoke !== null}
        onClose={() => { setConfirmRevoke(null); setRevokeError(''); }}
        title="Revoke Invitation"
        description={`Revoke the invitation sent to ${confirmRevoke?.email}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConfirmRevoke(null); setRevokeError(''); }} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="danger" loading={revoking} onClick={handleRevoke}>Revoke</Button>
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

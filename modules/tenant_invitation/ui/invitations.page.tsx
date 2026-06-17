'use client';

import { use, useEffect, useState, useMemo } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { ServerDataTable } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';
import {
  buildInvitationColumns,
  type InvitationRow,
} from '@kuraykaraaslan/tenant_invitation/ui/invitation-columns.component';
import { InvitationCreateModal } from '@kuraykaraaslan/tenant_invitation/ui/invitation-create-modal.component';

type SessionData = {
  tenantMember: { tenantMemberId: string; memberRole: MemberRole };
  tenant: { name: string };
};

const PAGE_SIZE = 25;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function TenantInvitationsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [session, setSession]         = useState<SessionData | null>(null);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');

  const [confirmRevoke, setConfirmRevoke] = useState<InvitationRow | null>(null);
  const [revoking, setRevoking]           = useState(false);
  const [revokeError, setRevokeError]     = useState('');
  const [showInvite, setShowInvite]       = useState(false);

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

  const canManage = session?.tenantMember.memberRole === 'ADMIN' || session?.tenantMember.memberRole === 'OWNER';

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
    setRevoking(true); setRevokeError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/invitations/${confirmRevoke.invitationId}`);
      setInvitations((prev) => prev.filter((inv) => inv.invitationId !== confirmRevoke.invitationId));
      setConfirmRevoke(null);
      toast.success('Invitation revoked.');
    } catch (err: unknown) {
      setRevokeError(extractMessage(err, 'Failed to revoke invitation.'));
    } finally { setRevoking(false); }
  }

  const columns = buildInvitationColumns({
    onRevoke: canManage ? (inv) => { setConfirmRevoke(inv); setRevokeError(''); } : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        subtitle="Pending invitations sent to new members"
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/invitations/settings`, variant: 'ghost' as const },
          ...(canManage ? [{ label: 'New Invitation', onClick: () => setShowInvite(true) }] : []),
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(inv) => inv.invitationId}
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No pending invitations."
        title="Pending Invitations"
        subtitle="Invitations that have been sent but not yet accepted"
      />

      <InvitationCreateModal
        open={showInvite}
        tenantId={tenantId}
        availableRoles={roleOptions}
        onClose={() => setShowInvite(false)}
        onCreated={(inv) => setInvitations((prev) => [inv, ...prev])}
      />

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

'use client';

import { use, useEffect, useState, useMemo } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faSearch, faUser, faGear } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole } from '@/modules/tenant_member/tenant_member.enums';
import { buildMemberColumns, type MemberRow } from '@/modules_next/tenant_member/ui/member-list-columns';

type SessionData = {
  tenantMember: { tenantMemberId: string; memberRole: MemberRole };
  tenant: { name: string };
};

const PAGE_SIZE = 25;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function TenantMembersPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch]   = useState('');

  const [showInvite, setShowInvite]   = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<MemberRole>('USER');
  const [inviting, setInviting]       = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<MemberRow | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/members`, { params: { pageSize: 100 } }),
    ])
      .then(([sessionRes, membersRes]) => {
        setSession(sessionRes.data);
        setMembers(membersRes.data.members ?? []);
      })
      .catch((err) => setFetchError(extractMessage(err, 'Failed to load members.')))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const canManage = session?.tenantMember.memberRole === 'ADMIN' || session?.tenantMember.memberRole === 'OWNER';

  const filtered = useMemo(
    () => members.filter((m) => m.user.email.toLowerCase().includes(search.toLowerCase())),
    [members, search],
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const roleOptions = useMemo(() => {
    const base = [{ value: 'USER', label: 'User' }, { value: 'ADMIN', label: 'Admin' }];
    if (session?.tenantMember.memberRole === 'OWNER') base.push({ value: 'OWNER', label: 'Owner' });
    return base;
  }, [session?.tenantMember.memberRole]);

  function closeInvite() { setShowInvite(false); setInviteEmail(''); setInviteRole('USER'); setInviteError(''); }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true); setInviteError('');
    try {
      await api.post(`/tenant/${tenantId}/api/invitations`, { email: inviteEmail, memberRole: inviteRole });
      closeInvite();
      toast.success('Invitation sent.');
    } catch (err: unknown) {
      setInviteError(extractMessage(err, 'Failed to send invitation.'));
    } finally { setInviting(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/members/${confirmDelete.tenantMemberId}`);
      setMembers((prev) => prev.filter((m) => m.tenantMemberId !== confirmDelete.tenantMemberId));
      setConfirmDelete(null);
      toast.success('Member removed.');
    } catch (err: unknown) {
      setDeleteError(extractMessage(err, 'Failed to remove member.'));
    } finally { setDeleting(false); }
  }

  function canDelete(member: MemberRow): boolean {
    if (!canManage) return false;
    if (member.tenantMemberId === session?.tenantMember.tenantMemberId) return false;
    if (member.memberRole === 'OWNER') return session?.tenantMember.memberRole === 'OWNER';
    return true;
  }

  const columns = buildMemberColumns({
    onRemove:  canManage ? (m) => { setConfirmDelete(m); setDeleteError(''); } : undefined,
    canRemove: canDelete,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        subtitle="People with access to this organization"
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/members/settings`, variant: 'ghost' as const },
          ...(canManage ? [{ label: 'Invite Member', onClick: () => setShowInvite(true) }] : []),
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(m) => m.tenantMemberId}
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage={search ? 'No members match your search.' : 'No members yet.'}
        toolbar={
          <div className="pb-4">
            <Input
              id="member-search" label="Search members" placeholder="Search by email…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        }
      />

      <Modal
        open={showInvite}
        onClose={closeInvite}
        title="Invite Member"
        description="Send an invitation email to add someone to this organization."
        footer={
          <>
            <Button variant="ghost" onClick={closeInvite} disabled={inviting}>Cancel</Button>
            <Button form="invite-member-form" type="submit" loading={inviting} iconLeft={<FontAwesomeIcon icon={faUserPlus} />}>
              Send Invite
            </Button>
          </>
        }
      >
        <form id="invite-member-form" onSubmit={handleInvite} className="space-y-4">
          {inviteError && <AlertBanner variant="error" message={inviteError} />}
          <Input
            id="invite-email" label="Email address" type="email" required
            placeholder="colleague@example.com"
            prefixIcon={<FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5" />}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Select id="invite-role" label="Role" options={roleOptions} value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as MemberRole)} />
        </form>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(''); }}
        title="Remove Member"
        description={`Remove ${confirmDelete?.user.email} from this organization?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConfirmDelete(null); setDeleteError(''); }} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Remove</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
        <p className="text-sm text-text-secondary">
          This will immediately revoke their access. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

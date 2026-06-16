'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@nb/common/ui/button.component';
import { Badge } from '@nb/common/ui/badge.component';
import { Input } from '@nb/common/ui/input.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { Modal } from '@nb/common/ui/modal.component';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUser } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole, TenantMemberStatus as MemberStatus } from '@nb/tenant_member/server/tenant_member.enums';
import api from '@nb/common/server/axios';

type Member = {
  tenantMemberId: string;
  userId: string;
  memberRole: MemberRole;
  memberStatus: MemberStatus;
  createdAt: string | null;
  user?: { userId: string; email: string } | null;
};

const memberStatusVariant: Record<MemberStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'neutral', SUSPENDED: 'warning', PENDING: 'warning',
};

const memberRoleVariant: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'warning', ADMIN: 'primary', USER: 'neutral',
};

const selectClass =
  'h-9 rounded-lg border border-border bg-surface-base px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus w-full';

const PAGE_SIZE = 10;

const columns: TableColumn<Member>[] = [
  {
    key: 'user',
    header: 'User',
    render: (m) => (
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-subtle text-primary text-xs shrink-0">
          <FontAwesomeIcon icon={faUser} />
        </span>
        <div>
          <p className="font-medium text-text-primary">{m.user?.email ?? m.userId}</p>
          {m.user?.email && <p className="text-xs text-text-secondary font-mono">{m.userId}</p>}
        </div>
      </div>
    ),
  },
  {
    key: 'memberRole',
    header: 'Role',
    render: (m) => <Badge variant={memberRoleVariant[m.memberRole]}>{m.memberRole}</Badge>,
  },
  {
    key: 'memberStatus',
    header: 'Status',
    render: (m) => <Badge variant={memberStatusVariant[m.memberStatus]} dot>{m.memberStatus}</Badge>,
  },
  {
    key: 'createdAt',
    header: 'Joined',
    render: (m) => (
      <span className="text-text-secondary">
        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
      </span>
    ),
  },
];

export function TenantMembersTable({ targetTenantId }: { targetTenantId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addValues, setAddValues] = useState({ userId: '', memberRole: 'USER' as MemberRole });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchMembers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/tenant/${targetTenantId}/api/members`, {
        params: { page: p, pageSize: PAGE_SIZE },
      });
      setMembers(res.data.members ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      // silent — member list is secondary
    } finally {
      setLoading(false);
    }
  }, [targetTenantId]);

  useEffect(() => { fetchMembers(page); }, [page, fetchMembers]);

  function openAdd() { setAddValues({ userId: '', memberRole: 'USER' }); setAddError(''); setShowAdd(true); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setAddError('');
    try {
      await api.post(`/tenant/${targetTenantId}/api/members`, {
        userId: addValues.userId.trim(),
        memberRole: addValues.memberRole,
      });
      setShowAdd(false);
      fetchMembers(page);
    } catch (err: any) {
      setAddError(err.response?.data?.message ?? err.message ?? 'Failed to add member.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <ServerDataTable
        columns={columns}
        rows={members}
        getRowKey={(m) => m.tenantMemberId}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No members yet."
        title="Members"
        subtitle={`${total} total`}
        headerRight={
          <Button size="sm" variant="outline" iconLeft={<FontAwesomeIcon icon={faPlus} />} onClick={openAdd}>
            Add Member
          </Button>
        }
      />

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Member"
        description="Add an existing user to this tenant"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAdd(false)} disabled={adding}>Cancel</Button>
            <Button form="add-member-form" type="submit" loading={adding}>Add</Button>
          </>
        }
      >
        <form id="add-member-form" onSubmit={handleAdd} className="space-y-4">
          {addError && <AlertBanner variant="error" message={addError} />}
          <Input
            id="add-userId"
            label="User ID"
            required
            placeholder="UUID of the user"
            value={addValues.userId}
            onChange={(e) => setAddValues((v) => ({ ...v, userId: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="add-role" className="text-xs font-medium text-text-secondary">Role</label>
            <select
              id="add-role"
              value={addValues.memberRole}
              onChange={(e) => setAddValues((v) => ({ ...v, memberRole: e.target.value as MemberRole }))}
              className={selectClass}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
        </form>
      </Modal>
    </>
  );
}

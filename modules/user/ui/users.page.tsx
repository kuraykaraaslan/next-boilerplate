'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import type { UserRole } from '@kuraykaraaslan/user/server/user.enums';
import { buildUserColumns, type UserRow } from '@kuraykaraaslan/user/ui/user-list-columns.component';
import { UserEditModal } from '@kuraykaraaslan/user/ui/user-edit-modal.component';

const PAGE_SIZE = 20;
const roleOptions = [{ value: 'USER', label: 'User' }, { value: 'ADMIN', label: 'Admin' }];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function UsersPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const [users, setUsers]     = useState<UserRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showCreate, setShowCreate]   = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');
  const [createValues, setCreateValues] = useState({ email: '', password: '', userRole: 'USER' as UserRole });

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/users`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined },
      });
      setUsers(res.data.users ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load users.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers(1, search); }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  useEffect(() => { fetchUsers(page, search); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setCreateError('');
    try {
      await api.post(`/tenant/${tenantId}/api/users`, createValues);
      setShowCreate(false);
      setCreateValues({ email: '', password: '', userRole: 'USER' });
      toast.success('User created.');
      fetchUsers(1, search); setPage(1);
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create user.'));
    } finally { setCreating(false); }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/users/${deletingUser.userId}`);
      setDeletingUser(null);
      if (selectedUser?.userId === deletingUser.userId) setSelectedUser(null);
      toast.success('User deleted.');
      fetchUsers(page, search);
    } catch (err: unknown) {
      setDeleteError(extractMessage(err, 'Failed to delete user.'));
    } finally { setDeleting(false); }
  }

  const columns = buildUserColumns({
    onEdit: (u) => setSelectedUser(u),
    onDelete: (u) => { setDeletingUser(u); setDeleteError(''); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle={loading ? '…' : `${total} account${total !== 1 ? 's' : ''} total`}
        actions={[{ label: 'Create User', onClick: () => setShowCreate(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={users}
        getRowKey={(u) => u.userId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(u) => setSelectedUser(u)}
        loading={loading}
        emptyMessage={search ? 'No users match your search.' : 'No users yet.'}
        toolbar={
          <div className="pb-4">
            <Input
              id="user-search"
              label="Search"
              placeholder="Search by email…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateError(''); setCreateValues({ email: '', password: '', userRole: 'USER' }); }}
        title="Create User"
        description="Add a new user to the system"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setCreateError(''); }} disabled={creating}>Cancel</Button>
            <Button form="create-user-form" type="submit" loading={creating}>Create</Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}
          <Input id="new-email" label="Email" type="email" required placeholder="user@example.com"
            value={createValues.email} onChange={(e) => setCreateValues((v) => ({ ...v, email: e.target.value }))} />
          <Input id="new-password" label="Password" type="password" required placeholder="Min. 8 characters"
            value={createValues.password} onChange={(e) => setCreateValues((v) => ({ ...v, password: e.target.value }))} />
          <Select id="new-role" label="Role" options={roleOptions} value={createValues.userRole}
            onChange={(e) => setCreateValues((v) => ({ ...v, userRole: e.target.value as UserRole }))} />
        </form>
      </Modal>

      <UserEditModal
        user={selectedUser}
        tenantId={tenantId}
        onClose={() => setSelectedUser(null)}
        onSave={() => fetchUsers(page, search)}
        onDeleteRequest={(u) => { setDeletingUser(u); setDeleteError(''); }}
      />

      <Modal
        open={!!deletingUser}
        onClose={() => { setDeletingUser(null); setDeleteError(''); }}
        title="Delete User"
        description={`Are you sure you want to delete ${deletingUser?.email}? This action cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDeletingUser(null); setDeleteError(''); }} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
      </Modal>
    </div>
  );
}

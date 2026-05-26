'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import api from '@/modules_next/common/axios';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Avatar } from '@/modules_next/common/ui/Avatar';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faBuilding,
  faArrowUpRightFromSquare,
  faPenToSquare,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import type { UserRole, UserStatus } from '@/modules/user/user.enums';
import type { TenantMemberRole as MemberRole, TenantMemberStatus as MemberStatus } from '@/modules/tenant_member/tenant_member.enums';
import type { TenantStatus } from '@/modules/tenant/tenant.enums';

type User = {
  userId: string;
  email: string;
  phone: string | null;
  userRole: UserRole;
  userStatus: UserStatus;
  createdAt: string;
};

type Membership = {
  tenantMemberId: string;
  tenantId: string;
  memberRole: MemberRole;
  memberStatus: MemberStatus;
  createdAt: string | null;
  tenant?: {
    tenantId: string;
    name: string;
    tenantStatus: TenantStatus;
  } | null;
};

const PAGE_SIZE = 20;

const statusVariant: Record<UserStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE:    'success',
  INACTIVE:  'neutral',
  SUSPENDED: 'warning',
};

const roleVariant: Record<UserRole, 'primary' | 'neutral'> = {
  ADMIN: 'primary',
  USER:  'neutral',
};

const memberRoleVariant: Record<MemberRole, 'warning' | 'primary' | 'neutral'> = {
  OWNER: 'warning',
  ADMIN: 'primary',
  USER:  'neutral',
};

const memberStatusVariant: Record<MemberStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE:    'success',
  INACTIVE:  'neutral',
  SUSPENDED: 'warning',
  PENDING:   'warning',
};

const tenantStatusVariant: Record<TenantStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'neutral',
  PENDING:  'warning',
  SUSPENDED:'warning',
  DELETED:  'error',
  ARCHIVED: 'neutral',
};

const roleOptions = [
  { value: 'USER',  label: 'User'  },
  { value: 'ADMIN', label: 'Admin' },
];

const statusOptions = [
  { value: 'ACTIVE',    label: 'Active'    },
  { value: 'INACTIVE',  label: 'Inactive'  },
  { value: 'SUSPENDED', label: 'Suspended' },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function UsersPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const [users, setUsers]   = useState<User[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Create modal
  const [showCreate, setShowCreate]   = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');
  const [createValues, setCreateValues] = useState({ email: '', password: '', userRole: 'USER' as UserRole });

  // Edit modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editValues, setEditValues] = useState({ email: '', phone: '', userRole: 'USER' as UserRole, userStatus: 'ACTIVE' as UserStatus });
  const [saving, setSaving]       = useState(false);
  const [editError, setEditError] = useState('');

  // Memberships (inside edit modal)
  const [memberships, setMemberships]               = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  // Delete confirm
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/users`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined },
      });
      setUsers(res.data.users ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load users.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers(1, search); }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Create ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api.post(`/tenant/${tenantId}/api/users`, createValues);
      setShowCreate(false);
      setCreateValues({ email: '', password: '', userRole: 'USER' });
      toast.success('User created.');
      fetchUsers(1, search);
      setPage(1);
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create user.'));
    } finally {
      setCreating(false);
    }
  }

  function closeCreate() {
    setShowCreate(false);
    setCreateError('');
    setCreateValues({ email: '', password: '', userRole: 'USER' });
  }

  // --- Edit ---
  function openEdit(user: User) {
    setSelectedUser(user);
    setEditValues({
      email:      user.email,
      phone:      user.phone ?? '',
      userRole:   user.userRole,
      userStatus: user.userStatus,
    });
    setEditError('');
    setMemberships([]);
    setMembershipsLoading(true);
    api
      .get(`/tenant/${tenantId}/api/users/${user.userId}/tenants`)
      .then((res) => setMemberships(res.data.memberships ?? []))
      .catch(() => {})
      .finally(() => setMembershipsLoading(false));
  }

  function closeEdit() {
    setSelectedUser(null);
    setEditError('');
    setMemberships([]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setEditError('');
    try {
      await api.put(`/tenant/${tenantId}/api/users/${selectedUser.userId}`, {
        email:      editValues.email || null,
        phone:      editValues.phone || null,
        userRole:   editValues.userRole,
        userStatus: editValues.userStatus,
      });
      closeEdit();
      toast.success('User updated.');
      fetchUsers(page, search);
    } catch (err: unknown) {
      setEditError(extractMessage(err, 'Failed to save changes.'));
    } finally {
      setSaving(false);
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!deletingUser) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/users/${deletingUser.userId}`);
      setDeletingUser(null);
      if (selectedUser?.userId === deletingUser.userId) closeEdit();
      toast.success('User deleted.');
      fetchUsers(page, search);
    } catch (err: unknown) {
      setDeleteError(extractMessage(err, 'Failed to delete user.'));
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<User>[] = [
    {
      key: 'email',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.email} size="sm" />
          <div>
            <p className="font-medium text-text-primary">{u.email}</p>
            {u.phone && <p className="text-xs text-text-secondary">{u.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'userRole',
      header: 'Role',
      render: (u) => <Badge variant={roleVariant[u.userRole]}>{u.userRole}</Badge>,
    },
    {
      key: 'userStatus',
      header: 'Status',
      render: (u) => <Badge variant={statusVariant[u.userStatus]} dot>{u.userStatus}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (u) => (
        <span className="text-text-secondary">
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'Edit',
                icon: <FontAwesomeIcon icon={faPenToSquare} />,
                onClick: () => openEdit(u),
              },
              {
                label: 'Delete',
                icon: <FontAwesomeIcon icon={faTrash} />,
                onClick: () => { setDeletingUser(u); setDeleteError(''); },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    },
  ];

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
        onRowClick={(u) => openEdit(u)}
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

      {/* ── Create Modal ── */}
      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="Create User"
        description="Add a new user to the system"
        footer={
          <>
            <Button variant="ghost" onClick={closeCreate} disabled={creating}>Cancel</Button>
            <Button form="create-user-form" type="submit" loading={creating}>Create</Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}
          <Input
            id="new-email"
            label="Email"
            type="email"
            required
            placeholder="user@example.com"
            value={createValues.email}
            onChange={(e) => setCreateValues((v) => ({ ...v, email: e.target.value }))}
          />
          <Input
            id="new-password"
            label="Password"
            type="password"
            required
            placeholder="Min. 8 characters"
            value={createValues.password}
            onChange={(e) => setCreateValues((v) => ({ ...v, password: e.target.value }))}
          />
          <Select
            id="new-role"
            label="Role"
            options={roleOptions}
            value={createValues.userRole}
            onChange={(e) => setCreateValues((v) => ({ ...v, userRole: e.target.value as UserRole }))}
          />
        </form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        open={!!selectedUser}
        onClose={closeEdit}
        title="Edit User"
        description={selectedUser?.email}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { if (selectedUser) { setDeletingUser(selectedUser); setDeleteError(''); } }}
              disabled={saving}
              className="mr-auto !text-error"
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={closeEdit} disabled={saving}>Cancel</Button>
            <Button form="edit-user-form" type="submit" loading={saving}>Save</Button>
          </>
        }
      >
        <div className="space-y-6">
          <form id="edit-user-form" onSubmit={handleSave} className="space-y-4">
            {editError && <AlertBanner variant="error" message={editError} />}
            <Input
              id="edit-email"
              label="Email"
              type="email"
              placeholder="user@example.com"
              value={editValues.email}
              onChange={(e) => setEditValues((v) => ({ ...v, email: e.target.value }))}
            />
            <Input
              id="edit-phone"
              label="Phone"
              type="tel"
              placeholder="+90 555 000 0000"
              value={editValues.phone}
              onChange={(e) => setEditValues((v) => ({ ...v, phone: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                id="edit-role"
                label="Role"
                options={roleOptions}
                value={editValues.userRole}
                onChange={(e) => setEditValues((v) => ({ ...v, userRole: e.target.value as UserRole }))}
              />
              <Select
                id="edit-status"
                label="Status"
                options={statusOptions}
                value={editValues.userStatus}
                onChange={(e) => setEditValues((v) => ({ ...v, userStatus: e.target.value as UserStatus }))}
              />
            </div>
          </form>

          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5 text-text-secondary" />
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Tenant Memberships</p>
              {!membershipsLoading && (
                <span className="ml-auto text-xs text-text-secondary">
                  {memberships.length} tenant{memberships.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {membershipsLoading ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : memberships.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No tenant memberships.</p>
            ) : (
              <div className="space-y-2">
                {memberships.map((m) => (
                  <div
                    key={m.tenantMemberId}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay transition-colors"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle text-primary text-xs shrink-0">
                      <FontAwesomeIcon icon={faBuilding} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {m.tenant?.name ?? m.tenantId}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant={memberRoleVariant[m.memberRole]}>{m.memberRole}</Badge>
                        <Badge variant={memberStatusVariant[m.memberStatus]} dot>{m.memberStatus}</Badge>
                        {m.tenant && (
                          <Badge variant={tenantStatusVariant[m.tenant.tenantStatus]}>{m.tenant.tenantStatus}</Badge>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/tenant/${tenantId}/admin/tenants/${m.tenantId}`}
                      className="text-text-secondary hover:text-primary transition-colors shrink-0"
                      title="Open tenant"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
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

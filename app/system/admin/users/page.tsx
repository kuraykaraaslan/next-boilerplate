'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { Input } from '@/modules/ui/Input';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Modal } from '@/modules/ui/Modal';
import { Pagination } from '@/modules/ui/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faUser, faBuilding, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

type UserRole    = 'USER' | 'ADMIN';
type UserStatus  = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
type MemberRole  = 'OWNER' | 'ADMIN' | 'USER';
type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED' | 'ARCHIVED';

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

const selectClass =
  'h-9 rounded-lg border border-border bg-surface-base px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus w-full';

export default function UsersPage() {
  const [users, setUsers]   = useState<User[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState('');
  const [createValues, setCreateValues] = useState({ email: '', password: '', userRole: 'USER' as UserRole });

  // Edit modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editValues, setEditValues] = useState({ email: '', phone: '', userRole: 'USER' as UserRole, userStatus: 'ACTIVE' as UserStatus });
  const [saving, setSaving]   = useState(false);
  const [editError, setEditError] = useState('');

  // Tenant memberships (inside edit modal)
  const [memberships, setMemberships]       = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  // Delete confirm modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get('/system/api/users', { params: { page: p, pageSize: PAGE_SIZE, search: q || undefined } });
      setUsers(res.data.users ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: any) {
      setFetchError(err.response?.data?.message ?? err.message ?? 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(0, search), search ? 300 : 0);
    setPage(0);
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
      await api.post('/system/api/users', createValues);
      setShowCreate(false);
      setCreateValues({ email: '', password: '', userRole: 'USER' });
      fetchUsers(0, search);
    } catch (err: any) {
      setCreateError(err.response?.data?.message ?? err.message ?? 'Failed to create user.');
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
    setEditValues({ email: user.email, phone: user.phone ?? '', userRole: user.userRole, userStatus: user.userStatus });
    setEditError('');
    setShowDeleteConfirm(false);
    setMemberships([]);
    setMembershipsLoading(true);
    api.get(`/system/api/users/${user.userId}/tenants`)
      .then((res) => setMemberships(res.data.memberships ?? []))
      .catch(() => {})
      .finally(() => setMembershipsLoading(false));
  }

  function closeEdit() {
    setSelectedUser(null);
    setEditError('');
    setShowDeleteConfirm(false);
    setDeleteError('');
    setMemberships([]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setEditError('');
    try {
      await api.put(`/system/api/users/${selectedUser.userId}`, {
        email:      editValues.email || null,
        phone:      editValues.phone || null,
        userRole:   editValues.userRole,
        userStatus: editValues.userStatus,
      });
      closeEdit();
      fetchUsers(page, search);
    } catch (err: any) {
      setEditError(err.response?.data?.message ?? err.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!selectedUser) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/system/api/users/${selectedUser.userId}`);
      setShowDeleteConfirm(false);
      closeEdit();
      fetchUsers(page, search);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? err.message ?? 'Failed to delete user.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Users</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {loading ? '…' : `${total} user${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Button iconLeft={<FontAwesomeIcon icon={faPlus} />} onClick={() => setShowCreate(true)}>
          Create User
        </Button>
      </div>

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <Card>
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

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr
                      key={user.userId}
                      className="hover:bg-surface-overlay transition-colors cursor-pointer"
                      onClick={() => openEdit(user)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary text-xs font-semibold shrink-0">
                            <FontAwesomeIcon icon={faUser} />
                          </span>
                          <div>
                            <p className="font-medium text-text-primary">{user.email}</p>
                            {user.phone && <p className="text-xs text-text-secondary">{user.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={roleVariant[user.userRole]}>{user.userRole}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant[user.userStatus]} dot>{user.userStatus}</Badge>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-primary hover:underline">Edit</span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-text-secondary">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center px-6 py-4 border-t border-border -mb-4">
              <Pagination
                page={page + 1}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p - 1)}
                showFirstLast
              />
            </div>
          </>
        )}
      </Card>

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
            id="new-email" label="Email" type="email" required placeholder="user@example.com"
            value={createValues.email}
            onChange={(e) => setCreateValues((v) => ({ ...v, email: e.target.value }))}
          />
          <Input
            id="new-password" label="Password" type="password" required placeholder="Min. 8 characters"
            value={createValues.password}
            onChange={(e) => setCreateValues((v) => ({ ...v, password: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="new-role" className="text-xs font-medium text-text-secondary">Role</label>
            <select id="new-role" value={createValues.userRole} onChange={(e) => setCreateValues((v) => ({ ...v, userRole: e.target.value as UserRole }))} className={selectClass}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
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
            <Button variant="ghost" onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); }} disabled={saving} className="mr-auto !text-error">
              Delete
            </Button>
            <Button variant="ghost" onClick={closeEdit} disabled={saving}>Cancel</Button>
            <Button form="edit-user-form" type="submit" loading={saving}>Save</Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Edit form */}
          <form id="edit-user-form" onSubmit={handleSave} className="space-y-4">
            {editError && <AlertBanner variant="error" message={editError} />}
            <Input
              id="edit-email" label="Email" type="email" placeholder="user@example.com"
              value={editValues.email}
              onChange={(e) => setEditValues((v) => ({ ...v, email: e.target.value }))}
            />
            <Input
              id="edit-phone" label="Phone" type="tel" placeholder="+90 555 000 0000"
              value={editValues.phone}
              onChange={(e) => setEditValues((v) => ({ ...v, phone: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-role" className="text-xs font-medium text-text-secondary">Role</label>
                <select id="edit-role" value={editValues.userRole} onChange={(e) => setEditValues((v) => ({ ...v, userRole: e.target.value as UserRole }))} className={selectClass}>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-status" className="text-xs font-medium text-text-secondary">Status</label>
                <select id="edit-status" value={editValues.userStatus} onChange={(e) => setEditValues((v) => ({ ...v, userStatus: e.target.value as UserStatus }))} className={selectClass}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
          </form>

          {/* Tenant memberships */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5 text-text-secondary" />
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Tenant Memberships</p>
              {!membershipsLoading && (
                <span className="ml-auto text-xs text-text-secondary">{memberships.length} tenant{memberships.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {membershipsLoading ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : memberships.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No tenant memberships.</p>
            ) : (
              <div className="space-y-2">
                {memberships.map((m) => (
                  <div key={m.tenantMemberId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay transition-colors">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle text-primary text-xs shrink-0">
                      <FontAwesomeIcon icon={faBuilding} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {m.tenant?.name ?? m.tenantId}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={memberRoleVariant[m.memberRole]}>{m.memberRole}</Badge>
                        <Badge variant={memberStatusVariant[m.memberStatus]} dot>{m.memberStatus}</Badge>
                        {m.tenant && (
                          <Badge variant={tenantStatusVariant[m.tenant.tenantStatus]}>{m.tenant.tenantStatus}</Badge>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/system/admin/tenants/${m.tenantId}`}
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
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.email}? This action cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
      </Modal>
    </div>
  );
}

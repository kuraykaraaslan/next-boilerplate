'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { Input } from '@/modules/ui/Input';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Modal } from '@/modules/ui/Modal';
import { Pagination } from '@/modules/ui/Pagination';
import { Breadcrumb } from '@/modules/ui/Breadcrumb';
import { PageHeader } from '@/modules/ui/PageHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faGlobe, faPeopleGroup, faGear,
  faPlus, faTrash, faCheck, faBan, faUser, faCreditCard,
} from '@fortawesome/free-solid-svg-icons';

type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED' | 'ARCHIVED';
type DomainStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'VERIFIED';
type MemberRole   = 'OWNER' | 'ADMIN' | 'USER';
type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

type Domain = {
  tenantDomainId: string;
  domain: string;
  isPrimary: boolean;
  domainStatus: DomainStatus;
  createdAt: string | null;
};

type Member = {
  tenantMemberId: string;
  userId: string;
  memberRole: MemberRole;
  memberStatus: MemberStatus;
  createdAt: string | null;
  user?: { userId: string; email: string } | null;
};

type Tenant = {
  tenantId: string;
  name: string;
  description: string | null;
  tenantStatus: TenantStatus;
  createdAt: string | null;
  updatedAt: string | null;
  domains?: Domain[] | null;
};

const PAGE_SIZE = 10;

const statusVariant: Record<TenantStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'neutral',
  PENDING:  'warning',
  SUSPENDED:'warning',
  DELETED:  'error',
  ARCHIVED: 'neutral',
};

const memberStatusVariant: Record<MemberStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE:    'success',
  INACTIVE:  'neutral',
  SUSPENDED: 'warning',
  PENDING:   'warning',
};

const memberRoleVariant: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'warning',
  ADMIN: 'primary',
  USER:  'neutral',
};

const domainStatusVariant: Record<DomainStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE:   'success',
  VERIFIED: 'success',
  PENDING:  'warning',
  INACTIVE: 'neutral',
};

const selectClass =
  'h-9 rounded-lg border border-border bg-surface-base px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus w-full';

export default function TenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [tenant, setTenant]   = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Members
  const [members, setMembers]       = useState<Member[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPage, setMemberPage] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editValues, setEditValues] = useState({ name: '', description: '', tenantStatus: 'ACTIVE' as TenantStatus });
  const [saving, setSaving]     = useState(false);
  const [editError, setEditError] = useState('');

  // Add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberValues, setAddMemberValues] = useState({ userId: '', memberRole: 'USER' as MemberRole });
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  // Delete confirm modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const memberTotalPages = Math.max(1, Math.ceil(memberTotal / PAGE_SIZE));

  // --- Fetch tenant ---
  useEffect(() => {
    setLoading(true);
    api.get(`/system/api/tenants/${tenantId}`)
      .then((res) => setTenant(res.data.tenant))
      .catch((err) => setPageError(err.response?.data?.message ?? err.message ?? 'Failed to load tenant.'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  // --- Fetch members ---
  const fetchMembers = useCallback(async (p: number) => {
    setMembersLoading(true);
    try {
      const res = await api.get(`/system/api/tenant/${tenantId}/members`, {
        params: { page: p, pageSize: PAGE_SIZE },
      });
      setMembers(res.data.members ?? []);
      setMemberTotal(res.data.total ?? 0);
    } catch {
      // silent — member list is secondary
    } finally {
      setMembersLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchMembers(memberPage);
  }, [memberPage, fetchMembers]);

  // --- Edit ---
  function openEdit() {
    if (!tenant) return;
    setEditValues({ name: tenant.name, description: tenant.description ?? '', tenantStatus: tenant.tenantStatus });
    setEditError('');
    setShowEdit(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const res = await api.put(`/system/api/tenants/${tenantId}`, {
        name: editValues.name,
        description: editValues.description || null,
        tenantStatus: editValues.tenantStatus,
      });
      setTenant(res.data.tenant);
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.response?.data?.message ?? err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  // --- Quick status change ---
  async function handleStatusChange(newStatus: TenantStatus) {
    try {
      const res = await api.put(`/system/api/tenants/${tenantId}`, { tenantStatus: newStatus });
      setTenant(res.data.tenant);
    } catch (err: any) {
      setPageError(err.response?.data?.message ?? err.message ?? 'Failed to update status.');
    }
  }

  // --- Delete ---
  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/system/api/tenants/${tenantId}`);
      router.push('/system/admin/tenants');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? err.message ?? 'Failed to delete tenant.');
      setDeleting(false);
    }
  }

  // --- Add member ---
  function openAddMember() {
    setAddMemberValues({ userId: '', memberRole: 'USER' });
    setAddMemberError('');
    setShowAddMember(true);
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddingMember(true);
    setAddMemberError('');
    try {
      await api.post(`/system/api/tenant/${tenantId}/members`, {
        userId: addMemberValues.userId.trim(),
        memberRole: addMemberValues.memberRole,
      });
      setShowAddMember(false);
      fetchMembers(memberPage);
    } catch (err: any) {
      setAddMemberError(err.response?.data?.message ?? err.message ?? 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (pageError || !tenant) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Tenants', href: '/system/admin/tenants' }, { label: 'Tenant' }]} />
        <AlertBanner variant="error" message={pageError || 'Tenant not found.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Tenants', href: '/system/admin/tenants' }, { label: tenant.name }]} />

      <PageHeader
        title={tenant.name}
        subtitle={tenant.tenantId}
        badge={<Badge variant={statusVariant[tenant.tenantStatus]} dot>{tenant.tenantStatus}</Badge>}
        actions={[{ label: 'Edit', variant: 'outline', onClick: openEdit }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Details */}
          <Card title="Details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-text-secondary mb-0.5">Name</dt>
                <dd className="text-text-primary font-medium">{tenant.name}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Status</dt>
                <dd><Badge variant={statusVariant[tenant.tenantStatus]} dot>{tenant.tenantStatus}</Badge></dd>
              </div>
              {tenant.description && (
                <div className="sm:col-span-2">
                  <dt className="text-text-secondary mb-0.5">Description</dt>
                  <dd className="text-text-primary">{tenant.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-text-secondary mb-0.5">Created</dt>
                <dd className="text-text-primary font-medium">
                  {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Last Updated</dt>
                <dd className="text-text-primary font-medium">
                  {tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleDateString() : '—'}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Members */}
          <Card
            title="Members"
            subtitle={`${memberTotal} total`}
            headerRight={
              <Button size="sm" variant="outline" iconLeft={<FontAwesomeIcon icon={faPlus} />} onClick={openAddMember}>
                Add Member
              </Button>
            }
          >
            {membersLoading ? (
              <div className="flex justify-center py-8"><Spinner size="md" /></div>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {members.map((m) => (
                        <tr key={m.tenantMemberId} className="hover:bg-surface-overlay transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-subtle text-primary text-xs shrink-0">
                                <FontAwesomeIcon icon={faUser} />
                              </span>
                              <div>
                                <p className="font-medium text-text-primary">{m.user?.email ?? m.userId}</p>
                                {m.user?.email && <p className="text-xs text-text-secondary font-mono">{m.userId}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={memberRoleVariant[m.memberRole]}>{m.memberRole}</Badge>
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={memberStatusVariant[m.memberStatus]} dot>{m.memberStatus}</Badge>
                          </td>
                          <td className="px-6 py-3 text-text-secondary">
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-sm text-text-secondary">No members yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-center px-6 py-4 border-t border-border -mb-4">
                  <Pagination
                    page={memberPage}
                    totalPages={memberTotalPages}
                    onPageChange={setMemberPage}
                    showFirstLast
                  />
                </div>
              </>
            )}
          </Card>

          {/* Domains */}
          {tenant.domains && tenant.domains.length > 0 && (
            <Card title="Custom Domains">
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Domain</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Primary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tenant.domains.map((d) => (
                      <tr key={d.tenantDomainId} className="hover:bg-surface-overlay transition-colors">
                        <td className="px-6 py-3 font-mono text-text-primary">{d.domain}</td>
                        <td className="px-6 py-3">
                          <Badge variant={domainStatusVariant[d.domainStatus]} dot>{d.domainStatus}</Badge>
                        </td>
                        <td className="px-6 py-3">
                          {d.isPrimary && <Badge variant="primary">Primary</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar — Actions */}
        <div className="space-y-4">
          <Card title="Actions">
            <div className="space-y-2">
              <a href={`/tenant/${tenantId}/admin/members`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faPeopleGroup} />}>
                  View Members
                </Button>
              </a>
              <a href={`/tenant/${tenantId}/admin/settings`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faGear} />}>
                  Tenant Settings
                </Button>
              </a>
              <a href={`/tenant/${tenantId}/admin/subscription`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faCreditCard} />}>
                  Subscription
                </Button>
              </a>
              <a href={`/system/admin/payments?tenantId=${tenantId}`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faGlobe} />}>
                  View Payments
                </Button>
              </a>
            </div>
          </Card>

          <Card title="Status Management">
            <div className="space-y-2">
              {tenant.tenantStatus !== 'ACTIVE' && (
                <Button
                  variant="outline"
                  fullWidth
                  iconLeft={<FontAwesomeIcon icon={faCheck} />}
                  onClick={() => handleStatusChange('ACTIVE')}
                >
                  Set Active
                </Button>
              )}
              {tenant.tenantStatus === 'ACTIVE' && (
                <Button
                  variant="outline"
                  fullWidth
                  iconLeft={<FontAwesomeIcon icon={faBan} />}
                  onClick={() => handleStatusChange('SUSPENDED')}
                  className="!text-warning border-warning/40 hover:bg-warning/5"
                >
                  Suspend
                </Button>
              )}
              {tenant.tenantStatus !== 'ARCHIVED' && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => handleStatusChange('ARCHIVED')}
                  className="!text-text-secondary"
                >
                  Archive
                </Button>
              )}
            </div>
          </Card>

          <Card title="Danger Zone">
            <p className="text-xs text-text-secondary mb-3">
              Permanently deletes this tenant and all associated data. This cannot be undone.
            </p>
            <Button
              variant="danger"
              fullWidth
              iconLeft={<FontAwesomeIcon icon={faTrash} />}
              onClick={() => { setShowDelete(true); setDeleteError(''); }}
            >
              Delete Tenant
            </Button>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Tenant"
        description={tenant.tenantId}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEdit(false)} disabled={saving}>Cancel</Button>
            <Button form="edit-tenant-form" type="submit" loading={saving}>Save</Button>
          </>
        }
      >
        <form id="edit-tenant-form" onSubmit={handleSave} className="space-y-4">
          {editError && <AlertBanner variant="error" message={editError} />}
          <Input
            id="edit-name"
            label="Name"
            required
            placeholder="Acme Corp"
            value={editValues.name}
            onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
          />
          <Input
            id="edit-desc"
            label="Description"
            placeholder="Optional description"
            value={editValues.description}
            onChange={(e) => setEditValues((v) => ({ ...v, description: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="edit-status" className="text-xs font-medium text-text-secondary">Status</label>
            <select
              id="edit-status"
              value={editValues.tenantStatus}
              onChange={(e) => setEditValues((v) => ({ ...v, tenantStatus: e.target.value as TenantStatus }))}
              className={selectClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Add Member"
        description="Add an existing user to this tenant"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddMember(false)} disabled={addingMember}>Cancel</Button>
            <Button form="add-member-form" type="submit" loading={addingMember}>Add</Button>
          </>
        }
      >
        <form id="add-member-form" onSubmit={handleAddMember} className="space-y-4">
          {addMemberError && <AlertBanner variant="error" message={addMemberError} />}
          <Input
            id="add-userId"
            label="User ID"
            required
            placeholder="UUID of the user"
            value={addMemberValues.userId}
            onChange={(e) => setAddMemberValues((v) => ({ ...v, userId: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="add-role" className="text-xs font-medium text-text-secondary">Role</label>
            <select
              id="add-role"
              value={addMemberValues.memberRole}
              onChange={(e) => setAddMemberValues((v) => ({ ...v, memberRole: e.target.value as MemberRole }))}
              className={selectClass}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Tenant"
        description={`Are you sure you want to permanently delete "${tenant.name}"? All members, domains, and data will be lost.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete Permanently</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
      </Modal>
    </div>
  );
}

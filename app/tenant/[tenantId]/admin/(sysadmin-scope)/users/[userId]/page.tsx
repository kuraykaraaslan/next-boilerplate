'use client';
import { use, useEffect, useMemo, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { isRootTenant } from '@nb/tenant/server/tenant.constants';
import api from '@nb/common/server/axios';
import { Breadcrumb } from '@nb/common/ui/Breadcrumb';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { Card } from '@nb/common/ui/Card';
import { Button } from '@nb/common/ui/Button';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { Modal } from '@nb/common/ui/Modal';
import { Avatar } from '@nb/common/ui/Avatar';
import { ServerDataTable } from '@nb/common/ui/ServerDataTable';
import { toast } from '@nb/common/ui/toast.store';
import { UserRoleBadge } from '@nb/user/ui/UserRoleBadge';
import { UserStatusBadge } from '@nb/user/ui/UserStatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { type User, type Membership } from './user-detail.types';
import { buildMembershipColumns } from './user-detail-columns';

export default function UserDetailPage({ params }: { params: Promise<{ tenantId: string; userId: string }> }) {
  const { tenantId, userId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const router = useRouter();

  const [user, setUser]             = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading]       = useState(true);
  const [pageError, setPageError]   = useState('');

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/users/${userId}`),
      api.get(`/tenant/${tenantId}/api/users/${userId}/tenants`),
    ])
      .then(([userRes, membershipsRes]) => {
        setUser(userRes.data.user ?? userRes.data);
        setMemberships(membershipsRes.data.memberships ?? []);
      })
      .catch((err: any) => {
        setPageError(err.response?.data?.message ?? err.message ?? 'Failed to load user.');
      })
      .finally(() => setLoading(false));
  }, [tenantId, userId]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/users/${userId}`);
      toast.success('User deleted.');
      router.push(`/tenant/${tenantId}/admin/users`);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? err.message ?? 'Failed to delete user.');
      setDeleting(false);
    }
  }

  const membershipColumns = useMemo(
    () => buildMembershipColumns((id) => router.push(`/tenant/${tenantId}/admin/tenants/${id}`)),
    [router, tenantId],
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (pageError || !user) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Users', href: `/tenant/${tenantId}/admin/users` }, { label: 'User' }]} />
        <AlertBanner variant="error" message={pageError || 'User not found.'} />
      </div>
    );
  }

  const displayName = user.email;
  const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never';

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Users', href: `/tenant/${tenantId}/admin/users` }, { label: displayName }]} />

      <PageHeader
        title={displayName}
        subtitle={`User ID: ${userId}`}
        actions={[
          { label: 'Delete User', variant: 'danger', onClick: () => setShowDelete(true) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Account Details">
            <div className="flex items-start gap-4 mb-6">
              <Avatar name={user.email} size="lg" />
              <div>
                <p className="text-base font-semibold text-text-primary">{user.email}</p>
                {user.phone && <p className="text-sm text-text-secondary">{user.phone}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <UserRoleBadge role={user.userRole} />
                  <UserStatusBadge status={user.userStatus} />
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm border-t border-border pt-4">
              <div>
                <dt className="text-text-secondary mb-0.5">Email</dt>
                <dd className="text-text-primary font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Phone</dt>
                <dd className="text-text-primary font-medium">{user.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Email Verified</dt>
                <dd className="text-text-primary font-medium">
                  {user.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleDateString() : 'Not verified'}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Last Login</dt>
                <dd className="text-text-primary font-medium">{lastLogin}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Member Since</dt>
                <dd className="text-text-primary font-medium">{new Date(user.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </Card>

          <ServerDataTable
            columns={membershipColumns}
            rows={memberships}
            getRowKey={(m) => m.tenantMemberId}
            page={1}
            totalPages={1}
            total={memberships.length}
            onPageChange={() => {}}
            hidePagination
            title="Tenant Memberships"
            subtitle={`${memberships.length} organization${memberships.length !== 1 ? 's' : ''}`}
            emptyMessage="No tenant memberships."
          />
        </div>

        <div className="space-y-4">
          <Card title="Danger Zone">
            <p className="text-xs text-text-secondary mb-3">
              Permanently deletes this user and all their data. This cannot be undone.
            </p>
            <Button
              variant="danger"
              fullWidth
              iconLeft={<FontAwesomeIcon icon={faTrash} />}
              onClick={() => { setDeleteError(''); setShowDelete(true); }}
            >
              Delete User
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete User"
        description={`Are you sure you want to permanently delete ${user.email}? This action cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete User</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
      </Modal>
    </div>
  );
}

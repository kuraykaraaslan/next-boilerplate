'use client';
import { use, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Breadcrumb } from '@/modules/ui/Breadcrumb';
import { PageHeader } from '@/modules/ui/PageHeader';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Modal } from '@/modules/ui/Modal';
import { Avatar } from '@/modules/ui/Avatar';
import { UserRoleBadge } from '@/modules/domains/common/user/UserRoleBadge';
import { UserStatusBadge } from '@/modules/domains/common/user/UserStatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faArrowUpRightFromSquare, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';

type UserRole   = 'USER' | 'ADMIN';
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
type MemberRole   = 'OWNER' | 'ADMIN' | 'USER';
type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED' | 'ARCHIVED';

type User = {
  userId: string;
  email: string;
  phone: string | null;
  userRole: UserRole;
  userStatus: UserStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

type Membership = {
  tenantMemberId: string;
  tenantId: string;
  memberRole: MemberRole;
  memberStatus: MemberStatus;
  createdAt: string | null;
  tenant?: { tenantId: string; name: string; tenantStatus: TenantStatus } | null;
};

const memberRoleVariant: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
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

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/system/api/users/${userId}`),
      api.get(`/system/api/users/${userId}/tenants`),
    ])
      .then(([userRes, membershipsRes]) => {
        setUser(userRes.data.user ?? userRes.data);
        setMemberships(membershipsRes.data.memberships ?? []);
      })
      .catch((err: any) => {
        setPageError(err.response?.data?.message ?? err.message ?? 'Failed to load user.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/system/api/users/${userId}`);
      router.push('/system/admin/users');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? err.message ?? 'Failed to delete user.');
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (pageError || !user) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Users', href: '/system/admin/users' }, { label: 'User' }]} />
        <AlertBanner variant="error" message={pageError || 'User not found.'} />
      </div>
    );
  }

  const displayName = user.email;
  const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never';

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Users', href: '/system/admin/users' }, { label: displayName }]} />

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

          <Card
            title="Tenant Memberships"
            subtitle={`${memberships.length} organization${memberships.length !== 1 ? 's' : ''}`}
          >
            {memberships.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">No tenant memberships.</p>
            ) : (
              <div className="space-y-2">
                {memberships.map((m) => (
                  <div key={m.tenantMemberId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay transition-colors">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary text-xs shrink-0">
                      <FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {m.tenant?.name ?? m.tenantId}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={memberRoleVariant[m.memberRole]}>{m.memberRole}</Badge>
                        <Badge variant={memberStatusVariant[m.memberStatus]} dot>{m.memberStatus}</Badge>
                      </div>
                    </div>
                    <a
                      href={`/system/admin/tenants/${m.tenantId}`}
                      className="text-text-secondary hover:text-primary transition-colors shrink-0"
                      title="Open tenant"
                    >
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
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

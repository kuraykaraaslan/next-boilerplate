'use client';
import { use } from 'react';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUser, faShield, faBan } from '@fortawesome/free-solid-svg-icons';

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);

  const user = {
    userId,
    email: 'user@example.com',
    name: 'John Doe',
    userRole: 'USER' as 'ADMIN' | 'USER',
    userStatus: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'BANNED',
    createdAt: '2024-02-15',
    lastLoginAt: '2024-12-01',
    tenants: [
      { id: '1', name: 'Acme Corp', role: 'ADMIN' },
      { id: '2', name: 'Beta Labs', role: 'MEMBER' },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a
          href="/system/admin/users"
          className="text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
        </a>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{user.name ?? user.email}</h1>
          <p className="text-sm text-text-secondary mt-0.5">User ID: {userId}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Profile">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-text-secondary mb-0.5">Full Name</dt>
                <dd className="text-text-primary font-medium">{user.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Email</dt>
                <dd className="text-text-primary font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Role</dt>
                <dd><Badge variant={user.userRole === 'ADMIN' ? 'primary' : 'neutral'}>{user.userRole}</Badge></dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Status</dt>
                <dd>
                  <Badge variant={user.userStatus === 'ACTIVE' ? 'success' : user.userStatus === 'BANNED' ? 'error' : 'neutral'} dot>
                    {user.userStatus}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Member Since</dt>
                <dd className="text-text-primary font-medium">{user.createdAt}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Last Login</dt>
                <dd className="text-text-primary font-medium">{user.lastLoginAt}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Tenant Memberships" subtitle="Organizations this user belongs to">
            <div className="space-y-2">
              {user.tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-primary-subtle text-primary text-xs font-bold">
                      {tenant.name.charAt(0)}
                    </span>
                    <span className="text-sm font-medium text-text-primary">{tenant.name}</span>
                  </div>
                  <Badge variant="neutral">{tenant.role}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Actions">
            <div className="space-y-2">
              <Button
                variant="outline"
                fullWidth
                iconLeft={<FontAwesomeIcon icon={faShield} />}
              >
                Impersonate User
              </Button>
              <Button
                variant="danger"
                fullWidth
                iconLeft={<FontAwesomeIcon icon={faBan} />}
              >
                Ban User
              </Button>
            </div>
          </Card>

          <AlertBanner
            variant="info"
            title="Impersonation"
            message="Impersonating a user lets you view the app as them. All actions will be logged."
          />
        </div>
      </div>
    </div>
  );
}

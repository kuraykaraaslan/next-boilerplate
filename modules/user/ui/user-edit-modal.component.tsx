'use client';

import { useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import type { UserRole, UserStatus } from '@kuraykaraaslan/user/server/user.enums';
import type { TenantMemberRole as MemberRole, TenantMemberStatus as MemberStatus } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';
import type { TenantStatus } from '@kuraykaraaslan/tenant/server/tenant.enums';
import type { UserRow } from './user-list-columns.component';

type Membership = {
  tenantMemberId: string; tenantId: string;
  memberRole: MemberRole; memberStatus: MemberStatus;
  createdAt: string | null;
  tenant?: { tenantId: string; name: string; tenantStatus: TenantStatus } | null;
};

const roleOptions    = [{ value: 'USER', label: 'User' }, { value: 'ADMIN', label: 'Admin' }];
const statusOptions  = [
  { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'SUSPENDED', label: 'Suspended' },
];

const memberRoleVariant: Record<MemberRole, 'warning' | 'primary' | 'neutral'> = {
  OWNER: 'warning', ADMIN: 'primary', USER: 'neutral',
};
const memberStatusVariant: Record<MemberStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'neutral', SUSPENDED: 'warning', PENDING: 'warning',
};
const tenantStatusVariant: Record<TenantStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'neutral', PENDING: 'warning',
  SUSPENDED: 'warning', DELETED: 'error', ARCHIVED: 'neutral',
};

type Props = {
  user: UserRow | null;
  tenantId: string;
  onClose: () => void;
  onSave: () => void;
  onDeleteRequest: (user: UserRow) => void;
};

export function UserEditModal({ user, tenantId, onClose, onSave, onDeleteRequest }: Props) {
  const [values, setValues] = useState({ email: '', phone: '', userRole: 'USER' as UserRole, userStatus: 'ACTIVE' as UserStatus });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const [memberships, setMemberships]       = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setValues({ email: user.email, phone: user.phone ?? '', userRole: user.userRole, userStatus: user.userStatus });
    setError('');
    setMemberships([]);
    setMembershipsLoading(true);
    api.get(`/tenant/${tenantId}/api/users/${user.userId}/tenants`)
      .then((res) => setMemberships(res.data.memberships ?? []))
      .catch(() => {})
      .finally(() => setMembershipsLoading(false));
  }, [user, tenantId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setError('');
    try {
      await api.put(`/tenant/${tenantId}/api/users/${user.userId}`, {
        email:      values.email || null,
        phone:      values.phone || null,
        userRole:   values.userRole,
        userStatus: values.userStatus,
      });
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Edit User"
      description={user?.email}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => { if (user) onDeleteRequest(user); }}
            disabled={saving}
            className="mr-auto !text-error"
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button form="edit-user-form" type="submit" loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-6">
        <form id="edit-user-form" onSubmit={handleSave} className="space-y-4">
          {error && <AlertBanner variant="error" message={error} />}
          <Input id="edit-email" label="Email" type="email" placeholder="user@example.com" value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
          <Input id="edit-phone" label="Phone" type="tel" placeholder="+90 555 000 0000" value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select id="edit-role" label="Role" options={roleOptions} value={values.userRole}
              onChange={(e) => setValues((v) => ({ ...v, userRole: e.target.value as UserRole }))} />
            <Select id="edit-status" label="Status" options={statusOptions} value={values.userStatus}
              onChange={(e) => setValues((v) => ({ ...v, userStatus: e.target.value as UserStatus }))} />
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
                <div key={m.tenantMemberId}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle text-primary text-xs shrink-0">
                    <FontAwesomeIcon icon={faBuilding} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{m.tenant?.name ?? m.tenantId}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant={memberRoleVariant[m.memberRole]}>{m.memberRole}</Badge>
                      <Badge variant={memberStatusVariant[m.memberStatus]} dot>{m.memberStatus}</Badge>
                      {m.tenant && <Badge variant={tenantStatusVariant[m.tenant.tenantStatus]}>{m.tenant.tenantStatus}</Badge>}
                    </div>
                  </div>
                  <a href={`/tenant/${tenantId}/admin/tenants/${m.tenantId}`}
                    className="text-text-secondary hover:text-primary transition-colors shrink-0"
                    title="Open tenant" onClick={(e) => e.stopPropagation()}
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
  );
}

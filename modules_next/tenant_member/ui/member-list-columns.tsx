'use client';

import { Avatar } from '@/modules_next/common/ui/Avatar';
import { Badge } from '@/modules_next/common/ui/Badge';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import type { TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole } from '@/modules/tenant_member/tenant_member.enums';

export type MemberRow = {
  tenantMemberId: string;
  memberRole: MemberRole;
  memberStatus: string;
  createdAt: string;
  user: { userId: string; email: string };
};

export const ROLE_BADGE: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'primary',
  ADMIN: 'warning',
  USER:  'neutral',
};

export interface MemberColumnHandlers {
  onRemove?: (m: MemberRow) => void;
  canRemove?: (m: MemberRow) => boolean;
}

export function buildMemberColumns(h: MemberColumnHandlers): TableColumn<MemberRow>[] {
  const cols: TableColumn<MemberRow>[] = [
    {
      key: 'user', header: 'Member',
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.user.email} size="sm" />
          <p className="font-medium text-text-primary truncate">{m.user.email}</p>
        </div>
      ),
    },
    {
      key: 'memberRole', header: 'Role',
      render: (m) => <Badge variant={ROLE_BADGE[m.memberRole]}>{m.memberRole}</Badge>,
    },
    {
      key: 'createdAt', header: 'Joined',
      render: (m) => <span className="text-text-secondary">{new Date(m.createdAt).toLocaleDateString()}</span>,
    },
  ];

  if (h.onRemove) {
    const onRemove = h.onRemove;
    const canRemove = h.canRemove ?? (() => true);
    cols.push({
      key: '_actions', header: '', align: 'right',
      render: (m) =>
        canRemove(m) ? (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu actions={[
              { label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => onRemove(m) },
            ]} />
          </div>
        ) : null,
    });
  }

  return cols;
}

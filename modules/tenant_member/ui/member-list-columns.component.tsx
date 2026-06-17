'use client';

import { Avatar } from '@kuraykaraaslan/common/ui/avatar.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import type { TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPen } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';

export type MemberRow = {
  tenantMemberId: string;
  memberRole: MemberRole;
  memberStatus: string;
  createdAt: string;
  // The members API returns `user: undefined` when a membership references a
  // user row that no longer exists (orphaned member) — keep this optional so
  // the table never crashes on `.email`.
  user?: { userId: string; email: string };
};

export const ROLE_BADGE: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'primary',
  ADMIN: 'warning',
  USER:  'neutral',
};

export interface MemberColumnHandlers {
  onEdit?: (m: MemberRow) => void;
  canEdit?: (m: MemberRow) => boolean;
  onRemove?: (m: MemberRow) => void;
  canRemove?: (m: MemberRow) => boolean;
}

export function buildMemberColumns(h: MemberColumnHandlers): TableColumn<MemberRow>[] {
  const cols: TableColumn<MemberRow>[] = [
    {
      key: 'user', header: 'Member',
      render: (m) => {
        const email = m.user?.email ?? 'Unknown user';
        return (
          <div className="flex items-center gap-3">
            <Avatar name={email} size="sm" />
            <p className="font-medium text-text-primary truncate">{email}</p>
          </div>
        );
      },
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

  if (h.onEdit || h.onRemove) {
    const onEdit = h.onEdit;
    const onRemove = h.onRemove;
    const canEdit = h.canEdit ?? (() => true);
    const canRemove = h.canRemove ?? (() => true);
    cols.push({
      key: '_actions', header: '', align: 'right',
      render: (m) => {
        const actions = [];
        if (onEdit && canEdit(m)) {
          actions.push({ label: 'Edit', icon: <FontAwesomeIcon icon={faPen} />, onClick: () => onEdit(m) });
        }
        if (onRemove && canRemove(m)) {
          actions.push({ label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger' as const, onClick: () => onRemove(m) });
        }
        return actions.length ? (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu actions={actions} />
          </div>
        ) : null;
      },
    });
  }

  return cols;
}

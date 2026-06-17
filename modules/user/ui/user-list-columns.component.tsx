'use client';

import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Avatar } from '@kuraykaraaslan/common/ui/avatar.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import type { TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { UserRole, UserStatus } from '@kuraykaraaslan/user/server/user.enums';

export type UserRow = {
  userId: string;
  email: string;
  phone: string | null;
  userRole: UserRole;
  userStatus: UserStatus;
  createdAt: string;
};

const statusVariant: Record<UserStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'neutral', SUSPENDED: 'warning',
};

const roleVariant: Record<UserRole, 'primary' | 'neutral'> = {
  ADMIN: 'primary', USER: 'neutral',
};

type Handlers = {
  onEdit: (u: UserRow) => void;
  onDelete: (u: UserRow) => void;
};

export function buildUserColumns(h: Handlers): TableColumn<UserRow>[] {
  return [
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
              { label: 'Edit',   icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => h.onEdit(u) },
              { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, onClick: () => h.onDelete(u), variant: 'danger' },
            ]}
          />
        </div>
      ),
    },
  ];
}

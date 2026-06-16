'use client';

import { Badge } from '@nb/common/ui/Badge';
import { RowActionsMenu } from '@nb/common/ui/RowActionsMenu';
import type { TableColumn } from '@nb/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faBan } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole } from '@nb/tenant_member/server/tenant_member.enums';
import type { TenantInvitationStatus as InvitationStatus } from '@nb/tenant_invitation/server/tenant_invitation.enums';

export type InvitationRow = {
  invitationId: string;
  tenantId: string;
  email: string;
  invitedByUserId: string;
  memberRole: MemberRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export const STATUS_BADGE: Record<InvitationStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
  PENDING:  'warning',
  ACCEPTED: 'success',
  DECLINED: 'error',
  EXPIRED:  'neutral',
  REVOKED:  'neutral',
};

export const ROLE_BADGE: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'primary',
  ADMIN: 'warning',
  USER:  'neutral',
};

export interface InvitationColumnHandlers {
  onRevoke?: (inv: InvitationRow) => void;
}

export function buildInvitationColumns(h: InvitationColumnHandlers): TableColumn<InvitationRow>[] {
  const cols: TableColumn<InvitationRow>[] = [
    {
      key: 'email', header: 'Email',
      render: (inv) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />
          </span>
          <p className="font-medium text-text-primary truncate">{inv.email}</p>
        </div>
      ),
    },
    {
      key: 'memberRole', header: 'Role',
      render: (inv) => <Badge variant={ROLE_BADGE[inv.memberRole]}>{inv.memberRole}</Badge>,
    },
    {
      key: 'createdAt', header: 'Sent',
      render: (inv) => <span className="text-text-secondary">{new Date(inv.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'expiresAt', header: 'Expires',
      render: (inv) => <span className="text-text-secondary">{new Date(inv.expiresAt).toLocaleDateString()}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (inv) => <Badge variant={STATUS_BADGE[inv.status]}>{inv.status}</Badge>,
    },
  ];

  if (h.onRevoke) {
    const revoke = h.onRevoke;
    cols.push({
      key: '_actions', header: '', align: 'right',
      render: (inv) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Revoke', icon: <FontAwesomeIcon icon={faBan} />, variant: 'danger', onClick: () => revoke(inv) },
          ]} />
        </div>
      ),
    });
  }

  return cols;
}

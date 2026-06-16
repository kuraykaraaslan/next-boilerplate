import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@nb/common/ui/Badge';
import { RowActionsMenu } from '@nb/common/ui/RowActionsMenu';
import type { TableColumn } from '@nb/common/ui/ServerDataTable';
import { type Membership, memberRoleVariant, memberStatusVariant } from './user-detail.types';

export function buildMembershipColumns(onOpenTenant: (tenantId: string) => void): TableColumn<Membership>[] {
  return [
    {
      key: 'tenant',
      header: 'Tenant',
      render: (m) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5" />
          </span>
          <p className="text-sm font-medium text-text-primary truncate">
            {m.tenant?.name ?? m.tenantId}
          </p>
        </div>
      ),
    },
    {
      key: 'memberRole',
      header: 'Role',
      render: (m) => <Badge variant={memberRoleVariant[m.memberRole]}>{m.memberRole}</Badge>,
    },
    {
      key: 'memberStatus',
      header: 'Status',
      render: (m) => <Badge variant={memberStatusVariant[m.memberStatus]} dot>{m.memberStatus}</Badge>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (m) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'Open tenant',
                icon: <FontAwesomeIcon icon={faArrowUpRightFromSquare} />,
                onClick: () => onOpenTenant(m.tenantId),
              },
            ]}
          />
        </div>
      ),
    },
  ];
}

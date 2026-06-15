'use client';

import { Badge } from '@/modules_next/common/ui/Badge';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import type { TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faToggleOn, faToggleOff, faTrash } from '@fortawesome/free-solid-svg-icons';

export type FlagRow = {
  flagId: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  updatedAt: string;
};

type Handlers = {
  onToggle: (flag: FlagRow) => void;
  onEdit: (flag: FlagRow) => void;
  onRemove: (flag: FlagRow) => void;
};

export function buildFlagColumns(h: Handlers): TableColumn<FlagRow>[] {
  return [
    { key: 'key', header: 'Key', render: (f) => <span className="font-mono text-xs text-text-primary">{f.key}</span> },
    { key: 'name', header: 'Name', render: (f) => <span className="text-text-primary">{f.name}</span> },
    {
      key: 'enabled',
      header: 'State',
      render: (f) => <Badge variant={f.enabled ? 'success' : 'neutral'} dot>{f.enabled ? 'on' : 'off'}</Badge>,
    },
    {
      key: 'rolloutPercentage',
      header: 'Rollout',
      render: (f) => <span className="tabular-nums text-text-secondary">{f.rolloutPercentage}%</span>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (f) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: f.enabled ? 'Disable' : 'Enable',
                icon: <FontAwesomeIcon icon={f.enabled ? faToggleOff : faToggleOn} />,
                onClick: () => h.onToggle(f),
              },
              { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => h.onEdit(f) },
              { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, onClick: () => h.onRemove(f), variant: 'danger' },
            ]}
          />
        </div>
      ),
    },
  ];
}

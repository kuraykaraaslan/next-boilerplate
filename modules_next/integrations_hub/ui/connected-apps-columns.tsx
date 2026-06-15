'use client';

import { Badge } from '@/modules_next/common/ui/Badge';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import type { TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlug, faLinkSlash } from '@fortawesome/free-solid-svg-icons';
import type { ConnectedAppStatus } from '@/modules/integrations_hub/integrations_hub.enums';
import type { ConnectedApp } from '@/modules/integrations_hub/integrations_hub.types';

export type ConnectedAppRow = Pick<
  ConnectedApp,
  'connectedAppId' | 'connectorKey' | 'status' | 'externalAccountName'
> & { lastSyncAt: string | null; createdAt: string };

const statusVariant: Record<ConnectedAppStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  CONNECTED: 'success',
  PENDING_AUTH: 'warning',
  DISCONNECTED: 'neutral',
  ERROR: 'error',
};

type Handlers = { onDisconnect: (a: ConnectedAppRow) => void };

export function buildConnectedAppColumns(h: Handlers): TableColumn<ConnectedAppRow>[] {
  return [
    {
      key: 'connectorKey',
      header: 'Connector',
      render: (a) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={faPlug} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-text-primary">{a.connectorKey}</p>
            <p className="text-xs text-text-secondary truncate max-w-xs">{a.externalAccountName ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <Badge variant={statusVariant[a.status]} dot>{a.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'lastSyncAt',
      header: 'Last Sync',
      render: (a) => (
        <span className="text-text-secondary text-sm">
          {a.lastSyncAt ? new Date(a.lastSyncAt).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (a) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: a.status === 'DISCONNECTED' ? 'Disconnected' : 'Disconnect',
                icon: <FontAwesomeIcon icon={faLinkSlash} />,
                onClick: () => h.onDisconnect(a),
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    },
  ];
}

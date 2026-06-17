'use client';

import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import type { TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import type { ApiKeyScope } from '@kuraykaraaslan/api_key/server/api_key.enums';
import type { SafeApiKey as CanonicalSafeApiKey } from '@kuraykaraaslan/api_key/server/api_key.types';

export type SafeApiKey = Omit<CanonicalSafeApiKey, 'lastUsedAt' | 'expiresAt' | 'createdAt' | 'updatedAt'> & {
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const SCOPE_LABEL: Record<ApiKeyScope, string> = {
  read: 'Read', write: 'Write', admin: 'Admin', 'scim:read': 'SCIM Read', 'scim:write': 'SCIM Write',
};

const SCOPE_BADGE: Record<ApiKeyScope, 'primary' | 'warning' | 'error'> = {
  read: 'primary', write: 'warning', admin: 'error', 'scim:read': 'primary', 'scim:write': 'warning',
};

function formatDate(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

type Handlers = {
  onToggleActive: (key: SafeApiKey) => void;
  onRevoke: (key: SafeApiKey) => void;
};

export function buildApiKeyColumns(h: Handlers): TableColumn<SafeApiKey>[] {
  return [
    {
      key: 'name',
      header: 'Name',
      render: (k) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{k.name}</p>
          {k.description && <p className="text-xs text-text-secondary mt-0.5 truncate max-w-xs">{k.description}</p>}
        </div>
      ),
    },
    {
      key: 'scopes',
      header: 'Scopes',
      render: (k) => (
        <div className="flex flex-wrap gap-1">
          {k.scopes.map((s) => <Badge key={s} variant={SCOPE_BADGE[s]} size="sm">{SCOPE_LABEL[s]}</Badge>)}
        </div>
      ),
    },
    {
      key: 'lastUsedAt',
      header: 'Last used',
      render: (k) => <span className="text-text-secondary text-xs">{formatDate(k.lastUsedAt)}</span>,
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (k) => <span className="text-text-secondary text-xs">{formatDate(k.expiresAt)}</span>,
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (k) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle id={`toggle-${k.apiKeyId}`} label="" checked={k.isActive} onChange={() => h.onToggleActive(k)} />
        </div>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (k) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[{ label: 'Revoke', icon: <FontAwesomeIcon icon={faTrash} />, onClick: () => h.onRevoke(k), variant: 'danger' }]} />
        </div>
      ),
    },
  ];
}

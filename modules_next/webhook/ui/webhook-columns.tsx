'use client';

import { Badge } from '@/modules_next/common/ui/Badge';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import type { TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faFlask, faRotateRight, faListUl, faKey, faPen, faBolt } from '@fortawesome/free-solid-svg-icons';
import type { Webhook } from './webhook.types';

type WebhookColumnHandlers = {
  testing: string | null;
  onToggleActive: (webhook: Webhook) => void;
  onEdit: (webhook: Webhook) => void;
  onTest: (webhookId: string) => void;
  onTrigger: (webhook: Webhook) => void;
  onDeliveries: (webhook: Webhook) => void;
  onRotateSecret: (webhookId: string) => void;
  onDelete: (webhook: Webhook) => void;
};

export function buildWebhookColumns(h: WebhookColumnHandlers): TableColumn<Webhook>[] {
  return [
    {
      key: 'name',
      header: 'Webhook',
      render: (w) => (
        <div className="min-w-0">
          <p className="font-semibold text-text-primary truncate">{w.name}</p>
          <p className="text-xs text-text-secondary truncate max-w-md">{w.url}</p>
          {w.description && (
            <p className="text-xs text-text-secondary mt-0.5 truncate max-w-md">{w.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'events',
      header: 'Events',
      render: (w) => <Badge variant="neutral">{w.events.length} event{w.events.length !== 1 ? 's' : ''}</Badge>,
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (w) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <Toggle id={`toggle-${w.webhookId}`} label="" checked={w.isActive} onChange={() => h.onToggleActive(w)} />
          {!w.isActive && w.autoDisabledAt && (
            <span title={`Auto-disabled after ${w.consecutiveFailures} consecutive failures. Toggle on to re-enable.`}>
              <Badge variant="error">Auto-disabled</Badge>
            </span>
          )}
        </div>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (w) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              { label: 'Edit', icon: <FontAwesomeIcon icon={faPen} />, onClick: () => h.onEdit(w) },
              { label: h.testing === w.webhookId ? 'Testing…' : 'Send test event', icon: <FontAwesomeIcon icon={faFlask} />, onClick: () => h.onTest(w.webhookId) },
              { label: 'Trigger event…', icon: <FontAwesomeIcon icon={faBolt} />, onClick: () => h.onTrigger(w) },
              { label: 'View deliveries', icon: <FontAwesomeIcon icon={faListUl} />, onClick: () => h.onDeliveries(w) },
              { label: 'Rotate signing secret', icon: <FontAwesomeIcon icon={faKey} />, onClick: () => h.onRotateSecret(w.webhookId) },
              { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, onClick: () => h.onDelete(w), variant: 'danger' },
            ]}
          />
        </div>
      ),
    },
  ];
}

'use client';

import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight, faCircleCheck, faCircleXmark, faClock } from '@fortawesome/free-solid-svg-icons';
import { statusVariant, type Delivery, type Webhook } from './webhook.types';

type Props = {
  webhook: Webhook | null;
  deliveries: Delivery[];
  loading: boolean;
  onClose: () => void;
  onRedeliver: (webhookId: string, deliveryId: string) => void;
  redelivering: string | null;
  onReplayDeadLetter: (webhookId: string) => void;
};

function statusIcon(s: Delivery['status']) {
  return s === 'SUCCESS' ? faCircleCheck : s === 'FAILED' || s === 'DEAD_LETTERED' ? faCircleXmark : faClock;
}

export function WebhookDeliveryModal({ webhook, deliveries, loading, onClose, onRedeliver, redelivering, onReplayDeadLetter }: Props) {
  const deadLetterCount = deliveries.filter((d) => d.status === 'DEAD_LETTERED').length;

  const columns: TableColumn<Delivery>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={statusIcon(d.status)}
            className={d.status === 'SUCCESS' ? 'text-success' : d.status === 'FAILED' ? 'text-error' : 'text-warning'} />
          <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      render: (d) => <span className="font-mono text-xs text-text-primary">{d.event}</span>,
    },
    {
      key: 'responseStatus',
      header: 'HTTP',
      render: (d) => <span className="text-xs text-text-secondary">{d.responseStatus != null ? d.responseStatus : '—'}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (d) => <span className="text-xs text-text-secondary">{d.duration != null ? `${d.duration}ms` : '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'When',
      render: (d) => <span className="text-xs text-text-secondary whitespace-nowrap">{new Date(d.createdAt).toLocaleString()}</span>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (d) =>
        (d.status === 'FAILED' || d.status === 'DEAD_LETTERED') && webhook ? (
          <Button variant="ghost" size="sm"
            onClick={() => onRedeliver(webhook.webhookId, d.deliveryId)}
            disabled={redelivering === d.deliveryId}
            iconLeft={<FontAwesomeIcon icon={faRotateRight} />}>
            {redelivering === d.deliveryId ? 'Redelivering' : d.status === 'DEAD_LETTERED' ? 'Replay' : 'Redeliver'}
          </Button>
        ) : null,
    },
  ];

  return (
    <Modal
      open={!!webhook}
      onClose={onClose}
      title={`Deliveries — ${webhook?.name ?? ''}`}
      description={webhook?.url}
      size="lg"
    >
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : (
        <div className="space-y-3">
          {deadLetterCount > 0 && webhook && (
            <AlertBanner
              variant="warning"
              message={`${deadLetterCount} delivery exhausted all retries and is dead-lettered.`}
              action={{ label: 'Replay all', onClick: () => onReplayDeadLetter(webhook.webhookId) }}
            />
          )}
          <ServerDataTable
            columns={columns}
            rows={deliveries}
            getRowKey={(d) => d.deliveryId}
            page={1}
            totalPages={1}
            total={deliveries.length}
            onPageChange={() => {}}
            emptyMessage="No deliveries yet."
            hidePagination
          />
        </div>
      )}
    </Modal>
  );
}

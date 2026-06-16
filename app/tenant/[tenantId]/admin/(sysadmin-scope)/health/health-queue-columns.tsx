'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@nb/common/server/utils/cn';
import type { TableColumn } from '@nb/common/ui/server-data-table.component';
import type { QueueRow } from './health.types';

export const queueColumns: TableColumn<QueueRow>[] = [
  {
    key: 'name',
    header: 'Queue',
    render: (r: QueueRow) => (
      <div>
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faCircle}
            className={cn('w-2 h-2 shrink-0', r.queue.status === 'ok' ? 'text-success' : 'text-error')}
          />
          <span className="text-sm font-mono text-text-primary">{r.name}</span>
        </div>
        {r.queue.message && (
          <p className="text-xs text-error mt-0.5 font-mono pl-4">{r.queue.message}</p>
        )}
      </div>
    ),
  },
  {
    key: 'waiting',
    header: 'Waiting',
    align: 'center',
    render: (r: QueueRow) => (
      <span className={cn('text-sm tabular-nums font-medium', r.queue.waiting > 0 ? 'text-warning-fg' : 'text-text-secondary')}>
        {r.queue.waiting}
      </span>
    ),
  },
  {
    key: 'active',
    header: 'Active',
    align: 'center',
    render: (r: QueueRow) => (
      <span className={cn('text-sm tabular-nums font-medium', r.queue.active > 0 ? 'text-info' : 'text-text-secondary')}>
        {r.queue.active}
      </span>
    ),
  },
  {
    key: 'completed',
    header: 'Completed',
    align: 'center',
    render: (r: QueueRow) => (
      <span className="text-sm tabular-nums text-text-secondary">{r.queue.completed}</span>
    ),
  },
  {
    key: 'failed',
    header: 'Failed',
    align: 'center',
    render: (r: QueueRow) => (
      <span className={cn('text-sm tabular-nums font-medium', r.queue.failed > 0 ? 'text-error' : 'text-text-secondary')}>
        {r.queue.failed}
      </span>
    ),
  },
  {
    key: 'delayed',
    header: 'Delayed',
    align: 'center',
    render: (r: QueueRow) => (
      <span className={cn('text-sm tabular-nums', r.queue.delayed > 0 ? 'text-warning-fg' : 'text-text-secondary')}>
        {r.queue.delayed}
      </span>
    ),
  },
];

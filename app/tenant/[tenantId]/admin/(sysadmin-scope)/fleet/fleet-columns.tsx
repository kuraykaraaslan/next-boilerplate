import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Badge } from '@/modules_next/common/ui/Badge';
import type { TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { type ServiceRow, statusVariant } from './fleet.types';

export const fleetColumns: TableColumn<ServiceRow>[] = [
  {
    key: 'name',
    header: 'Service',
    render: (s) => (
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={s.icon} className="w-4 h-4 text-text-secondary shrink-0" />
        <div>
          <p className="font-medium text-text-primary">{s.name}</p>
          {s.message && (
            <p className="text-xs text-error mt-0.5 font-mono">{s.message}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    render: (s) => <Badge variant="neutral">{s.category}</Badge>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (s) => <Badge variant={statusVariant[s.status]} dot>{s.status}</Badge>,
  },
  {
    key: 'detail',
    header: 'Detail',
    render: (s) => <span className="font-mono text-xs text-text-secondary">{s.detail}</span>,
  },
];

'use client';

import { Badge } from '@nb/common/ui/badge.component';
import { RowActionsMenu } from '@nb/common/ui/row-actions-menu.component';
import type { TableColumn } from '@nb/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faEye } from '@fortawesome/free-solid-svg-icons';
import type { DynamicPageRecord } from '@nb/dynamic_page/server/dynamic_page.types';
import { DynamicPageStatus } from '@nb/dynamic_page/server/dynamic_page.enums';

export type DynamicPage = Pick<DynamicPageRecord, 'dynamicPageId' | 'title' | 'slug'> & {
  status: `${DynamicPageStatus}`;
  updatedAt: string;
};

export const STATUS_COLORS: Record<string, 'success' | 'warning' | 'neutral'> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'neutral',
};

export interface DynamicPageColumnHandlers {
  onEdit: (page: DynamicPage) => void;
  onPreview: (page: DynamicPage) => void;
  onDelete: (page: DynamicPage) => void;
}

export function buildDynamicPageColumns(h: DynamicPageColumnHandlers): TableColumn<DynamicPage>[] {
  return [
    {
      key: 'title', header: 'Page',
      render: (p) => (
        <div>
          <p className="font-medium text-text-primary">
            {p.title || <span className="italic text-text-secondary">Untitled</span>}
          </p>
          <p className="text-xs text-text-secondary">/{p.slug}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (p) => <Badge variant={STATUS_COLORS[p.status] ?? 'neutral'}>{p.status}</Badge>,
    },
    {
      key: 'updatedAt', header: 'Last updated',
      render: (p) => (
        <span className="text-text-secondary text-sm">
          {new Date(p.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit',    icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => h.onEdit(p) },
            { label: 'Preview', icon: <FontAwesomeIcon icon={faEye} />,         onClick: () => h.onPreview(p) },
            { label: 'Delete',  icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => h.onDelete(p) },
          ]} />
        </div>
      ),
    },
  ];
}

'use client';
import { cn } from '@nb/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { Pagination } from './pagination.component';
import { Spinner } from './spinner.component';

export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  sortDir?: 'asc' | 'desc' | 'none';
  onSort?: () => void;
};

type ServerDataTableProps<T extends Record<string, unknown>> = {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;

  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;

  onRowClick?: (row: T) => void;

  selectedKeys?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectRow?: (key: string, checked: boolean) => void;

  loading?: boolean;
  emptyMessage?: string;

  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  toolbar?: React.ReactNode;

  hidePagination?: boolean;

  className?: string;
};

export function ServerDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowKey,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onRowClick,
  selectedKeys,
  onSelectAll,
  onSelectRow,
  loading = false,
  emptyMessage = 'No results found.',
  title,
  subtitle,
  headerRight,
  toolbar,
  hidePagination = false,
  className,
}: ServerDataTableProps<T>) {
  const safeTotalPages = Math.max(1, totalPages);

  const rangeStart = total && pageSize ? (page - 1) * pageSize + 1 : null;
  const rangeEnd   = total && pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface-raised shadow-sm overflow-hidden',
        className
      )}
    >
      {(title || headerRight) && (
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border">
          <div>
            {title    && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
            {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}

      {toolbar && (
        <div className="px-6 pt-4 pb-0">{toolbar}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                {onSelectAll && (
                  <th scope="col" className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={selectedKeys?.size === rows.length && rows.length > 0}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary
                                 focus-visible:ring-2 focus-visible:ring-border-focus"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    scope="col"
                    aria-sort={col.sortable ? (col.sortDir ?? 'none') as any : undefined}
                    className={cn(
                      'px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider',
                      col.sortable && 'cursor-pointer select-none hover:text-text-primary',
                      col.align === 'center' && 'text-center',
                      col.align === 'right'  && 'text-right',
                      !col.align             && 'text-left'
                    )}
                    onClick={col.sortable ? col.onSort : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && col.sortDir === 'asc'  && <FontAwesomeIcon icon={faArrowUp}   className="w-3" aria-hidden />}
                      {col.sortable && col.sortDir === 'desc' && <FontAwesomeIcon icon={faArrowDown} className="w-3" aria-hidden />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-base">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (onSelectRow ? 1 : 0)}
                    className="px-6 py-10 text-center text-sm text-text-secondary"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'hover:bg-surface-overlay transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {onSelectRow && (
                      <td className="w-10 px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={selectedKeys?.has(getRowKey(row)) ?? false}
                          onChange={(e) => onSelectRow(getRowKey(row), e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-border text-primary
                                     focus-visible:ring-2 focus-visible:ring-border-focus"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={cn(
                          'px-6 py-4 text-text-primary',
                          col.align === 'center' && 'text-center',
                          col.align === 'right'  && 'text-right'
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : String(row[col.key as keyof T] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !hidePagination && (
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border flex-wrap">
          <p className="text-xs text-text-secondary">
            {total != null && rangeStart != null && rangeEnd != null
              ? `Showing ${rangeStart}–${rangeEnd} of ${total}`
              : total != null
              ? `${total} result${total !== 1 ? 's' : ''}`
              : null}
          </p>
          <Pagination
            page={page}
            totalPages={safeTotalPages}
            onPageChange={onPageChange}
            showFirstLast
          />
        </div>
      )}
    </div>
  );
}

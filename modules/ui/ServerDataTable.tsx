'use client';
import { cn } from '@/libs/utils/cn';
import { Pagination } from './Pagination';
import { Spinner } from './Spinner';
export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
};

type ServerDataTableProps<T extends Record<string, unknown>> = {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;

  // Pagination — all server-controlled, 1-based page index
  page: number;
  totalPages: number;
  total?: number;    // enables "Showing X–Y of Z" footer text
  pageSize?: number; // required when total is provided
  onPageChange: (page: number) => void;

  // Interaction
  onRowClick?: (row: T) => void;

  // State
  loading?: boolean;
  emptyMessage?: string;

  // Card header slots
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;

  // Toolbar slot — rendered above the table (search, filters, CTAs)
  toolbar?: React.ReactNode;

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
  loading = false,
  emptyMessage = 'No results found.',
  title,
  subtitle,
  headerRight,
  toolbar,
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
      {/* Card header */}
      {(title || headerRight) && (
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border">
          <div>
            {title    && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
            {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}

      {/* Toolbar */}
      {toolbar && (
        <div className="px-6 pt-4 pb-0">{toolbar}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    scope="col"
                    className={cn(
                      'px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider',
                      col.align === 'center' && 'text-center',
                      col.align === 'right'  && 'text-right',
                      !col.align             && 'text-left'
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-base">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
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

      {/* Pagination footer — always visible */}
      {!loading && (
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

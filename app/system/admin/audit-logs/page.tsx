'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/libs/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';
import { AuditLogFilters, type AuditLogFilterValues } from '@/modules_next/audit_log/ui/AuditLogFilters';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditActorType = 'USER' | 'SYSTEM';

type AuditLog = {
  auditLogId:   string;
  tenantId:     string | null;
  actorId:      string | null;
  actorType:    AuditActorType;
  action:       string;
  resourceType: string | null;
  resourceId:   string | null;
  metadata:     Record<string, unknown> | null;
  ipAddress:    string | null;
  userAgent:    string | null;
  createdAt:    string; // ISO string from JSON
};

type ApiResponse = {
  logs:  AuditLog[];
  total: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

/**
 * Format an ISO timestamp as a human-readable local date + time string,
 * with a relative hint when the event is recent.
 */
function formatTimestamp(iso: string): { absolute: string; relative: string } {
  const date = new Date(iso);
  const now   = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  let relative: string;
  if (diffSec < 60) {
    relative = 'just now';
  } else if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    relative = `${m}m ago`;
  } else if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    relative = `${h}h ago`;
  } else if (diffSec < 86400 * 7) {
    const d = Math.floor(diffSec / 86400);
    relative = `${d}d ago`;
  } else {
    relative = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const absolute = date.toLocaleString(undefined, {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return { absolute, relative };
}

/**
 * Derive a status from an audit log's action name.
 * Actions containing "fail", "error", "denied", or "invalid" are treated as errors.
 */
function deriveStatus(action: string): 'success' | 'error' {
  const lower = action.toLowerCase();
  if (
    lower.includes('fail') ||
    lower.includes('error') ||
    lower.includes('denied') ||
    lower.includes('invalid')
  ) {
    return 'error';
  }
  return 'success';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AuditLogsPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [filters, setFilters] = useState<AuditLogFilterValues>({ actor: '', action: '', dateFrom: '', dateTo: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (filters.actor.trim())    params.actorId   = filters.actor.trim();
      if (filters.action.trim())   params.action    = filters.action.trim();
      if (filters.dateFrom.trim()) params.dateFrom  = filters.dateFrom.trim();
      if (filters.dateTo.trim())   params.dateTo    = filters.dateTo.trim();

      const res = await api.get<ApiResponse>('/system/api/audit-logs', { params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleFiltersChange(next: AuditLogFilterValues) {
    setFilters(next);
    setPage(1);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="System-wide activity log across all tenants"
      />

      {error && <AlertBanner variant="error" message={error} />}

      <AuditLogFilters onChange={handleFiltersChange} />

      <Card>
        <div className="overflow-x-auto -mx-6 -mb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<FontAwesomeIcon icon={faClipboardList} className="w-5 h-5" />}
              title={hasFilters ? 'No audit logs match your filters' : 'No audit logs found'}
              description={hasFilters ? 'Try adjusting the filters.' : 'Activity will appear here as users interact with the system.'}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Actor</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Action</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Resource Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Resource ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">IP Address</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(
                  logs.map((log) => {
                    const { absolute, relative } = formatTimestamp(log.createdAt);
                    const status = deriveStatus(log.action);

                    return (
                      <tr
                        key={log.auditLogId}
                        className="hover:bg-surface-overlay transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-text-primary">{relative}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{absolute}</p>
                        </td>

                        {/* Actor */}
                        <td className="px-6 py-4">
                          {log.actorId ? (
                            <div>
                              <p className="font-mono text-xs text-text-primary break-all">
                                {log.actorId}
                              </p>
                              <p className="text-xs text-text-secondary mt-0.5">
                                {log.actorType}
                              </p>
                            </div>
                          ) : (
                            <span className="text-text-disabled">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-text-primary">
                            {log.action}
                          </span>
                        </td>

                        {/* Resource Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.resourceType ? (
                            <span className="text-text-secondary text-xs">{log.resourceType}</span>
                          ) : (
                            <span className="text-text-disabled">—</span>
                          )}
                        </td>

                        {/* Resource ID */}
                        <td className="px-6 py-4">
                          {log.resourceId ? (
                            <span className="font-mono text-xs text-text-secondary break-all">
                              {log.resourceId}
                            </span>
                          ) : (
                            <span className="text-text-disabled">—</span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.ipAddress ? (
                            <span className="font-mono text-xs text-text-secondary">
                              {log.ipAddress}
                            </span>
                          ) : (
                            <span className="text-text-disabled">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={status} dot>
                            {status === 'success' ? 'Success' : 'Error'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              iconLeft={<FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>

            <span className="text-sm text-text-secondary">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              iconRight={<FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

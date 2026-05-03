'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Input } from '@/modules/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
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
  const [logs,        setLogs]        = useState<AuditLog[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Debounce the search input so we don't fire a request on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        pageSize: PAGE_SIZE,
      };

      // The API exposes `actorId` and `action` filters separately.
      // We map the free-text search to both fields — the back-end
      // will apply whichever matches (or you can extend the route).
      if (debouncedSearch.trim()) {
        // Pass the raw search string; the server will match against actorId / action.
        params.actorId = debouncedSearch.trim();
        params.action  = debouncedSearch.trim();
      }

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
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Audit Logs</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            System-wide activity log across all tenants
          </p>
        </div>
        {total > 0 && !loading && (
          <span className="text-sm text-text-secondary">
            {total.toLocaleString()} event{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <AlertBanner variant="error" message={error} />
      )}

      <Card>
        {/* Search bar */}
        <div className="pb-4">
          <Input
            id="audit-search"
            label="Search"
            placeholder="Filter by actor ID or action…"
            prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 -mb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                    Timestamp
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                    Actor
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                    Resource Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                    Resource ID
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                    IP Address
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-text-disabled">
                        <FontAwesomeIcon icon={faClipboardList} className="w-8 h-8" />
                        <p className="text-sm">
                          {debouncedSearch
                            ? 'No audit logs match your search.'
                            : 'No audit logs found.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
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

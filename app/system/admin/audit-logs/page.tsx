'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Badge } from '@/modules_next/common/ui/Badge';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { AuditLogFilters, type AuditLogFilterValues } from '@/modules_next/audit_log/ui/AuditLogFilters';

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
  createdAt:    string;
};

type ApiResponse = {
  logs:  AuditLog[];
  total: number;
};

const PAGE_SIZE = 20;

function formatTimestamp(iso: string): { absolute: string; relative: string } {
  const date = new Date(iso);
  const now   = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  let relative: string;
  if (diffSec < 60) relative = 'just now';
  else if (diffSec < 3600)        relative = `${Math.floor(diffSec / 60)}m ago`;
  else if (diffSec < 86400)       relative = `${Math.floor(diffSec / 3600)}h ago`;
  else if (diffSec < 86400 * 7)   relative = `${Math.floor(diffSec / 86400)}d ago`;
  else relative = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

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

function deriveStatus(action: string): 'success' | 'error' {
  const lower = action.toLowerCase();
  if (lower.includes('fail') || lower.includes('error') || lower.includes('denied') || lower.includes('invalid')) {
    return 'error';
  }
  return 'success';
}

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function AuditLogsPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [filters, setFilters] = useState<AuditLogFilterValues>({ actor: '', action: '', dateFrom: '', dateTo: '' });
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (filters.actor.trim())    params.actorId  = filters.actor.trim();
      if (filters.action.trim())   params.action   = filters.action.trim();
      if (filters.dateFrom.trim()) params.dateFrom = filters.dateFrom.trim();
      if (filters.dateTo.trim())   params.dateTo   = filters.dateTo.trim();

      const res = await api.get<ApiResponse>('/system/api/audit-logs', { params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load audit logs.'));
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

  const hasFilters = Object.values(filters).some(Boolean);

  const columns: TableColumn<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (log) => {
        const { absolute, relative } = formatTimestamp(log.createdAt);
        return (
          <div className="whitespace-nowrap">
            <p className="text-text-primary">{relative}</p>
            <p className="text-xs text-text-secondary mt-0.5">{absolute}</p>
          </div>
        );
      },
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (log) =>
        log.actorId ? (
          <div>
            <p className="font-mono text-xs text-text-primary break-all">{log.actorId}</p>
            <p className="text-xs text-text-secondary mt-0.5">{log.actorType}</p>
          </div>
        ) : (
          <span className="text-text-disabled">—</span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <span className="font-mono text-xs text-text-primary whitespace-nowrap">{log.action}</span>
      ),
    },
    {
      key: 'resourceType',
      header: 'Resource Type',
      render: (log) =>
        log.resourceType ? (
          <span className="text-text-secondary text-xs whitespace-nowrap">{log.resourceType}</span>
        ) : (
          <span className="text-text-disabled">—</span>
        ),
    },
    {
      key: 'resourceId',
      header: 'Resource ID',
      render: (log) =>
        log.resourceId ? (
          <span className="font-mono text-xs text-text-secondary break-all">{log.resourceId}</span>
        ) : (
          <span className="text-text-disabled">—</span>
        ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log) =>
        log.ipAddress ? (
          <span className="font-mono text-xs text-text-secondary whitespace-nowrap">{log.ipAddress}</span>
        ) : (
          <span className="text-text-disabled">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => {
        const status = deriveStatus(log.action);
        return (
          <Badge variant={status} dot>
            {status === 'success' ? 'Success' : 'Error'}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="System-wide activity log across all tenants"
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <AuditLogFilters onChange={handleFiltersChange} />

      <ServerDataTable
        columns={columns}
        rows={logs}
        getRowKey={(log) => log.auditLogId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage={hasFilters ? 'No audit logs match your filters.' : 'No audit logs found.'}
      />
    </div>
  );
}

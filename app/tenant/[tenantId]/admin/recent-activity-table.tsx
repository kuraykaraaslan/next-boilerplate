'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/modules_next/common/axios';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { Badge } from '@/modules_next/common/ui/Badge';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Drawer } from '@/modules_next/common/ui/Drawer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import type { AuditSeverity } from '@/modules/audit_log/audit_log.enums';

type AuditLogRow = {
  auditLogId: string;
  tenantId: string;
  tenant?: { tenantId: string; name: string } | null;
  actorId: string | null;
  actorType: string;
  action: string;
  severity: AuditSeverity;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent?: string | null;
  createdAt: string;
};

type TenantOption = { tenantId: string; name: string };

const PAGE_SIZE = 10;

const SEVERITY_VARIANT: Record<AuditSeverity, 'neutral' | 'info' | 'warning' | 'error'> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const SEVERITY_OPTIONS = [
  { value: '', label: 'All severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function shortId(id: string | null | undefined): string {
  return id ? `${id.slice(0, 8)}…` : '—';
}

/**
 * Dashboard "Recent Activity" — a compact, filterable view over the audit trail.
 * Root admins get the cross-tenant feed (with a Tenant column + tenant filter);
 * every other tenant sees only its own activity. Clicking a row opens a drawer
 * with the full actor/tenant details.
 */
export function RecentActivityTable({ tenantId, isRoot }: { tenantId: string; isRoot: boolean }) {
  const [logs, setLogs]       = useState<AuditLogRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [actionQuery, setActionQuery] = useState('');
  const [severity, setSeverity]       = useState<AuditSeverity | ''>('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [tenants, setTenants]         = useState<TenantOption[]>([]);

  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  // Load the tenant list for the filter dropdown (root only).
  useEffect(() => {
    if (!isRoot) return;
    api.get(`/tenant/${tenantId}/api/tenants`, { params: { pageSize: 200 } })
      .then((res) => setTenants((res.data.tenants ?? []).map((t: TenantOption) => ({ tenantId: t.tenantId, name: t.name }))))
      .catch(() => {});
  }, [isRoot, tenantId]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setFetchError('');
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (actionQuery.trim()) params.action = actionQuery.trim();
      if (severity) params.severity = severity;
      if (isRoot && tenantFilter) params.filterTenantId = tenantFilter;

      const url = isRoot
        ? `/tenant/${tenantId}/api/audit-logs/cross-tenant`
        : `/tenant/${tenantId}/api/audit-logs`;

      api.get(url, { params })
        .then((res) => {
          setLogs(res.data.logs ?? []);
          setTotal(res.data.total ?? 0);
        })
        .catch((err) => setFetchError(extractMessage(err, 'Failed to load recent activity.')))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [tenantId, isRoot, page, actionQuery, severity, tenantFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(actionQuery || severity || tenantFilter);

  const tenantOptions = useMemo(
    () => [{ value: '', label: 'All tenants' }, ...tenants.map((t) => ({ value: t.tenantId, label: t.name }))],
    [tenants],
  );

  const columns: TableColumn<AuditLogRow>[] = [
    {
      key: 'createdAt', header: 'Time',
      render: (r) => <span className="text-text-secondary whitespace-nowrap">{formatTime(r.createdAt)}</span>,
    },
    ...(isRoot ? [{
      key: 'tenant', header: 'Tenant',
      render: (r: AuditLogRow) => (
        <span className="text-text-primary truncate">{r.tenant?.name ?? r.tenantId}</span>
      ),
    }] : []),
    {
      key: 'action', header: 'Action',
      render: (r) => <span className="font-mono text-xs text-text-primary">{r.action}</span>,
    },
    {
      key: 'actorType', header: 'User',
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-text-primary">{r.actorType}</span>
          <span className="font-mono text-[11px] text-text-secondary">{shortId(r.actorId)}</span>
        </div>
      ),
    },
    {
      key: 'severity', header: 'Severity', align: 'right',
      render: (r) => <Badge variant={SEVERITY_VARIANT[r.severity] ?? 'neutral'} dot>{r.severity}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        title="Recent Activity"
        subtitle={isRoot ? 'Latest audit events across all tenants' : 'Latest audit events in your workspace'}
        columns={columns}
        rows={logs}
        getRowKey={(r) => r.auditLogId}
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(r) => setSelected(r)}
        loading={loading}
        emptyMessage={hasFilters ? 'No activity matches your filters.' : 'No recent activity.'}
        toolbar={
          <div className={`pb-4 grid grid-cols-1 gap-4 sm:items-end ${isRoot ? 'sm:grid-cols-[1fr_auto_auto]' : 'sm:grid-cols-[1fr_auto]'}`}>
            <Input
              id="activity-search" label="Search action" placeholder="e.g. auth.login"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={actionQuery}
              onChange={(e) => { setActionQuery(e.target.value); setPage(1); }}
            />
            {isRoot && (
              <Select
                id="activity-tenant-filter" label="Tenant" options={tenantOptions} value={tenantFilter} searchable
                onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
              />
            )}
            <Select
              id="activity-severity-filter" label="Severity" options={SEVERITY_OPTIONS} value={severity}
              onChange={(e) => { setSeverity(e.target.value as AuditSeverity | ''); setPage(1); }}
            />
          </div>
        }
      />

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Activity Detail"
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={SEVERITY_VARIANT[selected.severity] ?? 'neutral'} dot>{selected.severity}</Badge>
              <span className="font-mono text-xs text-text-primary">{selected.action}</span>
            </div>

            <DetailRow label="Tenant" value={selected.tenant?.name ?? selected.tenantId} />
            <DetailRow label="Time" value={formatTime(selected.createdAt)} />
            <DetailRow label="User type" value={selected.actorType} />
            <DetailRow label="User ID" value={selected.actorId ?? '—'} mono />
            <DetailRow label="Resource type" value={selected.resourceType ?? '—'} />
            <DetailRow label="Resource ID" value={selected.resourceId ?? '—'} mono />
            <DetailRow label="IP address" value={selected.ipAddress ?? '—'} mono />
            {selected.userAgent && <DetailRow label="User agent" value={selected.userAgent} />}
            <DetailRow label="Audit log ID" value={selected.auditLogId} mono />
          </div>
        )}
      </Drawer>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <span className={mono ? 'font-mono text-xs text-text-primary break-all' : 'text-text-primary break-words'}>{value}</span>
    </div>
  );
}

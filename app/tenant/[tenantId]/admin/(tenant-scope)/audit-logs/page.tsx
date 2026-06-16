'use client';

import { use, useEffect, useMemo, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { Input } from '@nb/common/ui/Input';
import { Select } from '@nb/common/ui/Select';
import { Badge } from '@nb/common/ui/Badge';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { Drawer } from '@nb/common/ui/Drawer';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/ServerDataTable';
import { DateRangePicker, type DateRange } from '@nb/common/ui/DateRangePicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faGear, faDownload } from '@fortawesome/free-solid-svg-icons';
import type { AuditSeverity } from '@nb/audit_log/server/audit_log.enums';
import { isRootTenant } from '@nb/tenant/server/tenant.constants';

type AuditLogRow = {
  auditLogId: string;
  tenantId: string;
  tenant?: { tenantId: string; name: string } | null;
  actorId: string | null;
  actorType: string;
  onBehalfOfActorId?: string | null;
  action: string;
  severity: AuditSeverity;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  prevHash?: string | null;
  rowHash?: string | null;
  createdAt: string;
};

type TenantOption = { tenantId: string; name: string };

const PAGE_SIZE = 20;

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

export default function AuditLogsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  // Root tenant admins see a cross-tenant aggregated view (and can filter by
  // tenant); every other tenant only ever sees its own audit trail.
  const isRoot = isRootTenant(tenantId);

  const [logs, setLogs]       = useState<AuditLogRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [actionQuery, setActionQuery] = useState('');
  const [severity, setSeverity]       = useState<AuditSeverity | ''>('');
  const [dateRange, setDateRange]     = useState<DateRange>({ start: null, end: null });
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
      if (dateRange.start) params.fromDate = dateRange.start.toISOString();
      if (dateRange.end) params.toDate = dateRange.end.toISOString();
      if (isRoot && tenantFilter) params.filterTenantId = tenantFilter;

      const url = isRoot
        ? `/tenant/${tenantId}/api/audit-logs/cross-tenant`
        : `/tenant/${tenantId}/api/audit-logs`;

      api.get(url, { params })
        .then((res) => {
          setLogs(res.data.logs ?? []);
          setTotal(res.data.total ?? 0);
        })
        .catch((err) => setFetchError(extractMessage(err, 'Failed to load audit logs.')))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [tenantId, isRoot, page, actionQuery, severity, dateRange, tenantFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportHref = useMemo(() => {
    const qs = new URLSearchParams({ format: 'csv' });
    if (dateRange.start) qs.set('fromDate', dateRange.start.toISOString());
    if (dateRange.end) qs.set('toDate', dateRange.end.toISOString());
    return `/tenant/${tenantId}/api/audit-logs/export?${qs.toString()}`;
  }, [tenantId, dateRange]);

  const tenantOptions = useMemo(
    () => [{ value: '', label: 'All tenants' }, ...tenants.map((t) => ({ value: t.tenantId, label: t.name }))],
    [tenants],
  );

  const columns: TableColumn<AuditLogRow>[] = [
    ...(isRoot ? [{
      key: 'tenant', header: 'Tenant',
      render: (r: AuditLogRow) => (
        <span className="text-text-primary truncate">{r.tenant?.name ?? r.tenantId}</span>
      ),
    }] : []),
    {
      key: 'createdAt', header: 'Time',
      render: (r) => <span className="text-text-secondary whitespace-nowrap">{formatTime(r.createdAt)}</span>,
    },
    {
      key: 'action', header: 'Action',
      render: (r) => <span className="font-mono text-xs text-text-primary">{r.action}</span>,
    },
    {
      key: 'severity', header: 'Severity',
      render: (r) => <Badge variant={SEVERITY_VARIANT[r.severity] ?? 'neutral'} dot>{r.severity}</Badge>,
    },
    {
      key: 'actorType', header: 'Actor',
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-text-primary">{r.actorType}</span>
          <span className="font-mono text-[11px] text-text-secondary">{shortId(r.actorId)}</span>
        </div>
      ),
    },
    {
      key: 'resourceType', header: 'Resource',
      render: (r) => r.resourceType
        ? (
          <div className="flex flex-col">
            <span className="text-text-primary">{r.resourceType}</span>
            <span className="font-mono text-[11px] text-text-secondary">{shortId(r.resourceId)}</span>
          </div>
        )
        : <span className="text-text-secondary">—</span>,
    },
    {
      key: 'ipAddress', header: 'IP',
      render: (r) => <span className="font-mono text-xs text-text-secondary">{r.ipAddress ?? '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle={isRoot
          ? 'Tamper-evident record of actions across all tenants'
          : 'Tamper-evident record of actions taken in this organization'}
        actions={[
          { label: <><FontAwesomeIcon icon={faDownload} className="mr-2" />Export CSV</>, href: exportHref, variant: 'ghost' as const },
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/audit-logs/settings`, variant: 'ghost' as const },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={logs}
        getRowKey={(r) => r.auditLogId}
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(r) => setSelected(r)}
        loading={loading}
        emptyMessage={actionQuery || severity || dateRange.start || dateRange.end
          ? 'No audit logs match your filters.'
          : 'No audit logs recorded yet.'}
        toolbar={
          <div className={`pb-4 grid grid-cols-1 gap-4 sm:items-end ${isRoot ? 'sm:grid-cols-[1fr_auto_auto_auto]' : 'sm:grid-cols-[1fr_auto_auto]'}`}>
            <Input
              id="action-search" label="Search action" placeholder="e.g. auth.login"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={actionQuery}
              onChange={(e) => { setActionQuery(e.target.value); setPage(1); }}
            />
            {isRoot && (
              <Select
                id="tenant-filter" label="Tenant" options={tenantOptions} value={tenantFilter} searchable
                onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
              />
            )}
            <Select
              id="severity-filter" label="Severity" options={SEVERITY_OPTIONS} value={severity}
              onChange={(e) => { setSeverity(e.target.value as AuditSeverity | ''); setPage(1); }}
            />
            <DateRangePicker
              id="date-filter"
              label="Date range"
              value={dateRange}
              onChange={(r) => { setDateRange(r); setPage(1); }}
            />
          </div>
        }
      />

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Audit Log Detail"
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={SEVERITY_VARIANT[selected.severity] ?? 'neutral'} dot>{selected.severity}</Badge>
              <span className="font-mono text-xs text-text-primary">{selected.action}</span>
            </div>

            {isRoot && (
              <DetailRow label="Tenant" value={selected.tenant?.name ?? selected.tenantId} />
            )}
            <DetailRow label="Time" value={formatTime(selected.createdAt)} />
            <DetailRow label="Actor type" value={selected.actorType} />
            <DetailRow label="Actor ID" value={selected.actorId ?? '—'} mono />
            {selected.onBehalfOfActorId && (
              <DetailRow label="On behalf of" value={selected.onBehalfOfActorId} mono />
            )}
            <DetailRow label="Resource type" value={selected.resourceType ?? '—'} />
            <DetailRow label="Resource ID" value={selected.resourceId ?? '—'} mono />
            <DetailRow label="IP address" value={selected.ipAddress ?? '—'} mono />
            <DetailRow label="User agent" value={selected.userAgent ?? '—'} />

            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Metadata</p>
              {selected.metadata && Object.keys(selected.metadata).length > 0 ? (
                <pre className="text-xs bg-surface-sunken rounded-lg p-3 overflow-x-auto text-text-primary">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-text-secondary">—</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Integrity (hash chain)</p>
              <DetailRow label="Row hash" value={selected.rowHash ?? '—'} mono />
              <DetailRow label="Prev hash" value={selected.prevHash ?? '—'} mono />
            </div>

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

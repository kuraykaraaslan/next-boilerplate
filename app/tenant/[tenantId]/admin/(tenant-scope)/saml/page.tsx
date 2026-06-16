'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { Card } from '@nb/common/ui/Card';
import { Badge } from '@nb/common/ui/Badge';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { Breadcrumb } from '@nb/common/ui/Breadcrumb';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faUserPlus, faRightToBracket, faClock } from '@fortawesome/free-solid-svg-icons';
import type { SafeSamlConfig } from '@nb/auth_saml/server/auth_saml.types';

type AuditLog = {
  auditLogId: string;
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const ACTION_DISPLAY: Record<string, { label: string; variant: BadgeVariant }> = {
  'saml.login_success':   { label: 'Login success',     variant: 'success' },
  'saml.login_failed':    { label: 'Login failed',      variant: 'error'   },
  'saml.jit_provisioned': { label: 'JIT user created',  variant: 'info'    },
  'saml.jit_role_mapped': { label: 'JIT role mapped',   variant: 'neutral' },
};

function actionDisplay(action: string): { label: string; variant: BadgeVariant } {
  return ACTION_DISPLAY[action] ?? { label: action, variant: 'neutral' };
}

/** Pull the most human-readable one-liner out of an audit row's metadata. */
function summarize(log: AuditLog): string {
  const m = (log.metadata ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof m.email === 'string') parts.push(m.email);
  if (typeof m.memberRole === 'string') parts.push(String(m.memberRole));
  if (typeof m.reason === 'string') parts.push(String(m.reason));
  if (parts.length === 0 && typeof m.nameId === 'string') parts.push(m.nameId);
  return parts.length ? parts.join(' · ') : '—';
}

type SamlStatus = 'active' | 'disabled' | 'unconfigured';

function deriveStatus(config: SafeSamlConfig | null): SamlStatus {
  if (!config || !config.idpSsoUrl || !config.idpEntityId) return 'unconfigured';
  return config.isEnabled ? 'active' : 'disabled';
}

const STATUS_DISPLAY: Record<SamlStatus, { label: string; variant: BadgeVariant }> = {
  active:       { label: 'Active',          variant: 'success' },
  disabled:     { label: 'Disabled',        variant: 'warning' },
  unconfigured: { label: 'Not configured',  variant: 'neutral' },
};

function StatCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: any }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
          <FontAwesomeIcon icon={icon} className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">{label}</p>
          <div className="text-xl font-bold text-text-primary tabular-nums mt-0.5">{value}</div>
        </div>
      </div>
    </Card>
  );
}

export default function TenantSamlPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [config, setConfig] = useState<SafeSamlConfig | null>(null);
  const [jitTotal, setJitTotal] = useState(0);
  const [loginTotal, setLoginTotal] = useState(0);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);

  const auditUrl = `/tenant/${tenantId}/api/audit-logs`;

  // Status + headline metrics: loaded once. The per-action `total` from the
  // audit list is reused as a cheap count (pageSize=1 → just the counter).
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setError(null);
    try {
      const [cfgRes, jitRes, loginRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/saml/config`),
        api.get(auditUrl, { params: { action: 'saml.jit_provisioned', pageSize: 1 } }),
        api.get(auditUrl, { params: { action: 'saml.login_success', pageSize: 1 } }),
      ]);
      setConfig(cfgRes.data.config ?? null);
      setJitTotal(jitRes.data.total ?? 0);
      setLoginTotal(loginRes.data.total ?? 0);
      setLastLogin(loginRes.data.logs?.[0]?.createdAt ?? null);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load SAML overview.');
    } finally {
      setOverviewLoading(false);
    }
  }, [tenantId, auditUrl]);

  // Activity feed: all `saml.*` audit rows, paginated independently so paging
  // doesn't re-trigger the overview spinner.
  const loadActivity = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.get(auditUrl, { params: { action: 'saml', page, pageSize: PAGE_SIZE } });
      setLogs(res.data.logs ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setTableLoading(false);
    }
  }, [auditUrl, page]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadActivity(); }, [loadActivity]);

  const status = deriveStatus(config);
  const statusDisplay = STATUS_DISPLAY[status];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: TableColumn<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'When',
      render: (l) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {new Date(l.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Event',
      render: (l) => {
        const d = actionDisplay(l.action);
        return <Badge variant={d.variant}>{d.label}</Badge>;
      },
    },
    {
      key: '_details',
      header: 'Details',
      render: (l) => (
        <span className="text-xs text-text-primary break-all">{summarize(l)}</span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (l) => (
        <span className="font-mono text-xs text-text-secondary">{l.ipAddress ?? '—'}</span>
      ),
    },
  ];

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: `/tenant/${tenantId}/admin` },
          { label: 'SAML SSO' },
        ]}
      />

      <PageHeader
        title="SAML SSO"
        subtitle="Single sign-on activity and identity-provider status for this tenant."
        actions={[
          {
            label: <><FontAwesomeIcon icon={faGear} className="mr-2" />Settings</>,
            href: `/tenant/${tenantId}/admin/saml/settings`,
            variant: 'ghost',
          },
        ]}
      />

      {error && <AlertBanner variant="error" message={error} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
              <FontAwesomeIcon icon={faRightToBracket} className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">Status</p>
              <div className="mt-1">
                <Badge variant={statusDisplay.variant} dot>{statusDisplay.label}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <StatCard label="JIT-provisioned users" value={jitTotal.toLocaleString()} icon={faUserPlus} />
        <StatCard label="Successful logins" value={loginTotal.toLocaleString()} icon={faRightToBracket} />
        <StatCard
          label="Last login"
          value={
            <span className="text-sm font-semibold">
              {lastLogin ? new Date(lastLogin).toLocaleString() : '—'}
            </span>
          }
          icon={faClock}
        />
      </div>

      <Card title="SSO Activity" subtitle="JIT provisioning, role mapping and login events from the audit log.">
        <ServerDataTable
          columns={columns}
          rows={logs}
          getRowKey={(l) => l.auditLogId}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          loading={tableLoading}
          emptyMessage="No SAML activity yet."
        />
      </Card>
    </div>
  );
}

'use client';
import { use, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { Badge } from '@/modules_next/common/ui/Badge';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPeopleGroup,
  faNewspaper,
  faBoxOpen,
  faCreditCard,
  faFileInvoice,
  faTag,
  faBuilding,
  faUsers,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// Each stat card is backed by a list endpoint we already expose; we ask for a
// single row (`pageSize=1`) and read the `total` the API returns. A per-request
// `.catch(() => null)` keeps one failing endpoint from blanking the whole page.
type StatDef = {
  key: string;
  label: string;
  icon: IconDefinition;
  url: string;
  totalKey: string; // response field that carries the count
};

const TENANT_STATS = (tenantId: string): StatDef[] => [
  { key: 'members',  label: 'Members',    icon: faPeopleGroup, url: `/tenant/${tenantId}/api/members?pageSize=1`,        totalKey: 'total' },
  { key: 'posts',    label: 'Blog Posts', icon: faNewspaper,   url: `/tenant/${tenantId}/api/blog/posts?pageSize=1`,     totalKey: 'total' },
  { key: 'products', label: 'Products',   icon: faBoxOpen,     url: `/tenant/${tenantId}/api/store/products?pageSize=1`,  totalKey: 'total' },
  { key: 'payments', label: 'Payments',   icon: faCreditCard,  url: `/tenant/${tenantId}/api/payments?pageSize=1`,        totalKey: 'total' },
  { key: 'invoices', label: 'Invoices',   icon: faFileInvoice, url: `/tenant/${tenantId}/api/invoices?pageSize=1`,        totalKey: 'total' },
  { key: 'coupons',  label: 'Coupons',    icon: faTag,         url: `/tenant/${tenantId}/api/coupons?pageSize=1`,         totalKey: 'total' },
];

const ROOT_STATS = (tenantId: string): StatDef[] => [
  { key: 'tenants',    label: 'Tenants',    icon: faBuilding,         url: `/tenant/${tenantId}/api/tenants?pageSize=1`,    totalKey: 'total' },
  { key: 'users',      label: 'Users',      icon: faUsers,            url: `/tenant/${tenantId}/api/users?pageSize=1`,      totalKey: 'total' },
  { key: 'auditLogs',  label: 'Audit Logs', icon: faClockRotateLeft,  url: `/tenant/${tenantId}/api/audit-logs?pageSize=1`, totalKey: 'total' },
];

type PaymentRow = {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
};

type AuditRow = {
  auditLogId: string;
  action: string;
  actorType: string;
  severity: string;
  createdAt: string;
};

const PAYMENT_STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  PARTIALLY_REFUNDED: 'warning',
  REFUNDED: 'warning',
  FAILED: 'error',
  PENDING: 'info',
};

const SEVERITY_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

type DashboardData = {
  stats: Record<string, number | null>;
  payments: PaymentRow[];
  auditLogs: AuditRow[];
};

// Module-level cache (survives client-side navigation, cleared on full reload).
// Within the TTL we serve from cache with no request; once stale we still show
// the cached data instantly and revalidate in the background (no spinner).
const CACHE_TTL_MS = 60_000;
const dashboardCache = new Map<string, { at: number; data: DashboardData }>();

async function loadDashboard(tenantId: string, isRoot: boolean): Promise<DashboardData> {
  const statDefs = [...TENANT_STATS(tenantId), ...(isRoot ? ROOT_STATS(tenantId) : [])];

  const statPromises = statDefs.map((def) =>
    api
      .get(def.url)
      .then((res) => ({ key: def.key, value: res.data?.[def.totalKey] ?? null }))
      .catch(() => ({ key: def.key, value: null }))
  );

  const recentPromise = isRoot
    ? api
        .get(`/tenant/${tenantId}/api/audit-logs?pageSize=5`)
        .then((res) => ({ kind: 'audit' as const, rows: (res.data?.logs ?? []) as AuditRow[] }))
        .catch(() => ({ kind: 'audit' as const, rows: [] as AuditRow[] }))
    : api
        .get(`/tenant/${tenantId}/api/payments?pageSize=5`)
        .then((res) => ({ kind: 'payment' as const, rows: (res.data?.payments ?? []) as PaymentRow[] }))
        .catch(() => ({ kind: 'payment' as const, rows: [] as PaymentRow[] }));

  const [statResults, recent] = await Promise.all([Promise.all(statPromises), recentPromise]);

  const stats: Record<string, number | null> = {};
  for (const r of statResults) stats[r.key] = r.value;

  return {
    stats,
    payments: recent.kind === 'payment' ? recent.rows : [],
    auditLogs: recent.kind === 'audit' ? recent.rows : [],
  };
}

export default function TenantAdminDashboardPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const isRoot = isRootTenant(tenantId);

  // Seed state from the module cache so revisits render instantly (no spinner).
  const [stats, setStats] = useState<Record<string, number | null>>(() => dashboardCache.get(tenantId)?.data.stats ?? {});
  const [payments, setPayments] = useState<PaymentRow[]>(() => dashboardCache.get(tenantId)?.data.payments ?? []);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>(() => dashboardCache.get(tenantId)?.data.auditLogs ?? []);
  const [loading, setLoading] = useState(() => !dashboardCache.get(tenantId));

  useEffect(() => {
    let cancelled = false;

    // Fresh cache was already used to seed state — skip the network entirely.
    const cached = dashboardCache.get(tenantId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return;

    // No cache (spinner showing) or stale cache (showing stale data): fetch.
    loadDashboard(tenantId, isRoot)
      .then((data) => {
        dashboardCache.set(tenantId, { at: Date.now(), data });
        if (cancelled) return;
        setStats(data.stats);
        setPayments(data.payments);
        setAuditLogs(data.auditLogs);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, isRoot]);

  const statDefs = [...TENANT_STATS(tenantId), ...(isRoot ? ROOT_STATS(tenantId) : [])];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={isRoot ? 'Platform overview' : 'Overview of your workspace'}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statDefs.map((def) => (
          <StatCard
            key={def.key}
            label={def.label}
            icon={def.icon}
            value={stats[def.key] == null ? '—' : String(stats[def.key])}
          />
        ))}
      </div>

      {isRoot ? (
        <Card title="Recent Activity" subtitle="Latest audit log events">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-text-secondary">No recent activity.</p>
          ) : (
            <ul className="divide-y divide-border -my-2">
              {auditLogs.map((log) => (
                <li key={log.auditLogId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{log.action}</p>
                    <p className="text-xs text-text-secondary">{log.actorType}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={SEVERITY_VARIANT[log.severity] ?? 'neutral'} size="sm">{log.severity}</Badge>
                    <span className="text-xs text-text-secondary tabular-nums">{formatDate(log.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card title="Recent Activity" subtitle="Latest payments">
          {payments.length === 0 ? (
            <p className="text-sm text-text-secondary">No recent payments.</p>
          ) : (
            <ul className="divide-y divide-border -my-2">
              {payments.map((p) => (
                <li key={p.paymentId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {p.customerName || p.customerEmail || 'Unknown customer'}
                    </p>
                    <p className="text-xs text-text-secondary tabular-nums">{formatAmount(p.amount, p.currency)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={PAYMENT_STATUS_VARIANT[p.status] ?? 'neutral'} size="sm">{p.status}</Badge>
                    <span className="text-xs text-text-secondary tabular-nums">{formatDate(p.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: IconDefinition }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
          <FontAwesomeIcon icon={icon} className="w-4 h-4" />
        </span>
        <div>
          <p className="text-xs text-text-secondary">{label}</p>
          <p className="text-xl font-bold text-text-primary tabular-nums mt-0.5">{value}</p>
        </div>
      </div>
    </Card>
  );
}

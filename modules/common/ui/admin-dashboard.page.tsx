'use client';
import { use, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
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
import { RecentActivityTable } from './recent-activity-table.component';

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

// Module-level cache (survives client-side navigation, cleared on full reload).
// Within the TTL we serve from cache with no request; once stale we still show
// the cached data instantly and revalidate in the background (no spinner).
const CACHE_TTL_MS = 60_000;
const statsCache = new Map<string, { at: number; stats: Record<string, number | null> }>();

async function loadStats(tenantId: string, isRoot: boolean): Promise<Record<string, number | null>> {
  const statDefs = [...TENANT_STATS(tenantId), ...(isRoot ? ROOT_STATS(tenantId) : [])];

  const statResults = await Promise.all(
    statDefs.map((def) =>
      api
        .get(def.url)
        .then((res) => ({ key: def.key, value: res.data?.[def.totalKey] ?? null }))
        .catch(() => ({ key: def.key, value: null }))
    )
  );

  const stats: Record<string, number | null> = {};
  for (const r of statResults) stats[r.key] = r.value;
  return stats;
}

export default function TenantAdminDashboardPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const isRoot = isRootTenant(tenantId);

  // Seed state from the module cache so revisits render instantly (no spinner).
  const [stats, setStats] = useState<Record<string, number | null>>(() => statsCache.get(tenantId)?.stats ?? {});
  const [loading, setLoading] = useState(() => !statsCache.get(tenantId));

  useEffect(() => {
    let cancelled = false;

    // Fresh cache was already used to seed state — skip the network entirely.
    const cached = statsCache.get(tenantId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return;

    // No cache (spinner showing) or stale cache (showing stale data): fetch.
    loadStats(tenantId, isRoot)
      .then((s) => {
        statsCache.set(tenantId, { at: Date.now(), stats: s });
        if (!cancelled) setStats(s);
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

      <RecentActivityTable tenantId={tenantId} isRoot={isRoot} />
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

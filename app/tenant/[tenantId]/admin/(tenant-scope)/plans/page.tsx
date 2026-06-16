'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { ServerDataTable } from '@nb/common/ui/server-data-table.component';
import { toast } from '@nb/common/ui/toast.store';
import api from '@nb/common/server/axios';
import { buildPlanColumns, type PlanRow } from '@nb/tenant_subscription/ui/plan-list-columns.component';
import { PlanCreateModal } from '@nb/tenant_subscription/ui/plan-create-modal.component';

const PAGE_SIZE = 25;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function PlansPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [plans, setPlans]               = useState<PlanRow[]>([]);
  const [defaultPlanId, setDefaultPlanId] = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState('');
  const [createOpen, setCreateOpen]     = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const [plansRes, defaultRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/plans`),
        api.get(`/tenant/${tenantId}/api/plans/default`),
      ]);
      setPlans(plansRes.data.plans ?? []);
      setDefaultPlanId(defaultRes.data.defaultPlanId ?? null);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load plans.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  async function handleSetDefault(planId: string | null) {
    try {
      const res = await api.put(`/tenant/${tenantId}/api/plans/default`, { planId });
      setDefaultPlanId(res.data.defaultPlanId ?? null);
      toast.success(planId ? 'Default plan updated.' : 'Default plan cleared.');
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to update default plan.'));
    }
  }

  const total      = plans.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows   = plans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildPlanColumns({
    defaultPlanId,
    onManage:      (p) => router.push(`/tenant/${tenantId}/admin/plans/${p.planId}`),
    onOpenProduct: (p) => router.push(`/tenant/${tenantId}/admin/store/products/${p.productId}`),
    onSetDefault:  handleSetDefault,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        subtitle="Plans wrap a product with billing recurrence (monthly/yearly + trial)"
        actions={[{ label: 'Create Plan', onClick: () => setCreateOpen(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} dismissible />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(p) => p.planId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/tenant/${tenantId}/admin/plans/${p.planId}`)}
        loading={loading}
        emptyMessage="No subscription plans yet."
      />

      <PlanCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tenantId={tenantId}
        onCreate={fetchPlans}
      />
    </div>
  );
}

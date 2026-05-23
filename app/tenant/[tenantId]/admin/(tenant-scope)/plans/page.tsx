'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import api from '@/modules_next/common/axios';

type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

type Plan = {
  planId: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialDays: number;
  status: PlanStatus;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  _count?: { subscriptions: number };
};

type CreatePlanForm = {
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  currency: string;
  trialDays: string;
};

const EMPTY_FORM: CreatePlanForm = {
  name: '',
  description: '',
  monthlyPrice: '0',
  yearlyPrice: '0',
  currency: 'USD',
  trialDays: '0',
};

const PAGE_SIZE = 25;

const statusVariant: Record<PlanStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'warning',
  ARCHIVED: 'neutral',
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function PlansPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [plans, setPlans]     = useState<Plan[]>([]);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [createOpen, setCreateOpen]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm]               = useState<CreatePlanForm>(EMPTY_FORM);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/plans`);
      setPlans(res.data.plans ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load plans.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleField = (field: keyof CreatePlanForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCreateError('');
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setCreateError('Plan name is required.');
      return;
    }
    setSubmitting(true);
    setCreateError('');
    try {
      await api.post(`/tenant/${tenantId}/api/plans`, {
        name:         form.name.trim(),
        description:  form.description.trim() || undefined,
        monthlyPrice: parseFloat(form.monthlyPrice) || 0,
        yearlyPrice:  parseFloat(form.yearlyPrice)  || 0,
        currency:     form.currency.trim() || 'USD',
        trialDays:    parseInt(form.trialDays, 10)  || 0,
      });
      setCreateOpen(false);
      resetForm();
      toast.success('Plan created.');
      fetchPlans();
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create plan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const total = plans.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = plans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<Plan>[] = [
    {
      key: 'name',
      header: 'Plan',
      render: (plan) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={faTag} className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-text-primary flex items-center gap-1.5">
              {plan.name}
              {plan.isDefault && <Badge variant="primary">Default</Badge>}
            </p>
            {plan.description && (
              <p className="text-xs text-text-secondary truncate max-w-[200px]">{plan.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'monthlyPrice',
      header: 'Monthly',
      render: (plan) => (
        <span className="text-text-primary tabular-nums">{plan.monthlyPrice.toFixed(2)} {plan.currency}</span>
      ),
    },
    {
      key: 'yearlyPrice',
      header: 'Yearly',
      render: (plan) => (
        <span className="text-text-primary tabular-nums">{plan.yearlyPrice.toFixed(2)} {plan.currency}</span>
      ),
    },
    {
      key: 'trialDays',
      header: 'Trial',
      render: (plan) => (
        <span className="text-text-secondary">
          {plan.trialDays > 0 ? `${plan.trialDays}d` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (plan) => <Badge variant={statusVariant[plan.status]} dot>{plan.status}</Badge>,
    },
    {
      key: 'subscriptions',
      header: 'Tenants',
      render: (plan) => (
        <span className="text-text-primary tabular-nums">{plan._count?.subscriptions ?? '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (plan) => (
        <span className="text-text-secondary">{new Date(plan.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (plan) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'Manage',
                icon: <FontAwesomeIcon icon={faPenToSquare} />,
                onClick: () => router.push(`/tenant/${tenantId}/admin/plans/${plan.planId}`),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        subtitle="Manage all subscription plans"
        actions={[{ label: 'Create Plan', onClick: () => { resetForm(); setCreateOpen(true); } }]}
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

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        title="Create Subscription Plan"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); resetForm(); }} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleCreate}>Create Plan</Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} dismissible />}

          <Input
            id="plan-name"
            label="Name"
            value={form.name}
            onChange={handleField('name')}
            required
          />
          <Input
            id="plan-description"
            label="Description"
            value={form.description}
            onChange={handleField('description')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="plan-monthly-price"
              label="Monthly Price"
              type="number"
              value={form.monthlyPrice}
              onChange={handleField('monthlyPrice')}
            />
            <Input
              id="plan-yearly-price"
              label="Yearly Price"
              type="number"
              value={form.yearlyPrice}
              onChange={handleField('yearlyPrice')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="plan-currency"
              label="Currency"
              value={form.currency}
              onChange={handleField('currency')}
              hint="e.g. USD, EUR"
            />
            <Input
              id="plan-trial-days"
              label="Trial Days"
              type="number"
              value={form.trialDays}
              onChange={handleField('trialDays')}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

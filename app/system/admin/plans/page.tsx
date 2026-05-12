'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTag, faCreditCard } from '@fortawesome/free-solid-svg-icons';
import api from '@/libs/axios';

type Plan = {
  planId: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialDays: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
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

const INTERVAL_OPTIONS = ['MONTHLY', 'YEARLY'] as const;

const statusVariant = (s: Plan['status']): 'success' | 'warning' | 'error' | 'neutral' => {
  if (s === 'ACTIVE') return 'success';
  if (s === 'INACTIVE') return 'warning';
  return 'neutral';
};

export default function PlansPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePlanForm>({
    name: '',
    description: '',
    monthlyPrice: '0',
    yearlyPrice: '0',
    currency: 'USD',
    trialDays: '0',
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/system/api/subscriptions/plans');
      setPlans(res.data.plans ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleField = (field: keyof CreatePlanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetForm = () => {
    setForm({ name: '', description: '', monthlyPrice: '0', yearlyPrice: '0', currency: 'USD', trialDays: '0' });
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setCreateError('Plan name is required.');
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      await api.post('/system/api/subscriptions/plans', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        monthlyPrice: parseFloat(form.monthlyPrice) || 0,
        yearlyPrice: parseFloat(form.yearlyPrice) || 0,
        currency: form.currency.trim() || 'USD',
        trialDays: parseInt(form.trialDays, 10) || 0,
      });
      setCreateOpen(false);
      resetForm();
      fetchPlans();
    } catch (err: any) {
      setCreateError(err.response?.data?.message ?? err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        subtitle="Manage all subscription plans"
        actions={[{ label: 'Create Plan', onClick: () => { resetForm(); setCreateOpen(true); } }]}
      />

      {error && (
        <AlertBanner variant="error" message={error} dismissible />
      )}

      {/* Table card */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Plan</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Monthly Price</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Yearly Price</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Trial Days</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Tenants</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((plan) => (
                  <tr
                    key={plan.planId}
                    className="hover:bg-surface-raised transition-colors cursor-pointer"
                    onClick={() => router.push(`/system/admin/plans/${plan.planId}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-primary text-sm font-bold shrink-0">
                          <FontAwesomeIcon icon={faTag} className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <p className="font-medium text-text-primary flex items-center gap-1.5">
                            {plan.name}
                            {plan.isDefault && (
                              <Badge variant="primary">Default</Badge>
                            )}
                          </p>
                          {plan.description && (
                            <p className="text-xs text-text-secondary truncate max-w-[200px]">{plan.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-primary">
                      {plan.monthlyPrice.toFixed(2)} {plan.currency}
                    </td>
                    <td className="px-6 py-4 text-text-primary">
                      {plan.yearlyPrice.toFixed(2)} {plan.currency}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {plan.trialDays > 0 ? `${plan.trialDays}d` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant(plan.status)} dot>
                        {plan.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-text-primary">
                      {plan._count?.subscriptions ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-primary hover:underline">Manage</span>
                    </td>
                  </tr>
                ))}
                {!loading && plans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <EmptyState
                        icon={<FontAwesomeIcon icon={faCreditCard} className="w-5 h-5" />}
                        title="No subscription plans"
                        description="Create a plan to start offering subscriptions."
                        action={
                          <Button onClick={() => { resetForm(); setCreateOpen(true); }} iconLeft={<FontAwesomeIcon icon={faPlus} />}>
                            Create Plan
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Plan Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        title="Create Subscription Plan"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); resetForm(); }} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleCreate}>
              Create Plan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && (
            <AlertBanner variant="error" message={createError} dismissible />
          )}
          <Input
            id="plan-name"
            label="Name"
            value={form.name}
            onChange={handleField('name')}
            hint="Required"
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

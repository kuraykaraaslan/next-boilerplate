'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
import api from '@kuraykaraaslan/common/server/axios';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { PaymentSummaryCard } from '@kuraykaraaslan/payment/ui/payment-summary-card.component';
import { PaymentStatusBadge, type PaymentStatus } from '@kuraykaraaslan/payment/ui/payment-status-badge.component';
import { PaymentRefundModal } from '@kuraykaraaslan/payment/ui/payment-refund-modal.component';
import { PaymentTransactionsPanel } from '@kuraykaraaslan/payment/ui/payment-transactions-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faLock, faBan, faRotateLeft } from '@fortawesome/free-solid-svg-icons';

type Transaction = {
  transactionId: string; type: string; status: string;
  amount: number; currency: string; provider: string; createdAt: string;
};

type Payment = {
  paymentId: string; status: PaymentStatus; amount: number; currency: string;
  provider: string; paymentMethod?: string | null; providerPaymentId?: string | null;
  customerEmail?: string | null; customerName?: string | null; description?: string | null;
  metadata?: Record<string, unknown> | null; paidAt?: string | null; createdAt: string;
  transactions?: Transaction[]; userId?: string | null; tenantId?: string | null;
};

type PaymentSubject = {
  kind: 'SUBSCRIPTION' | 'STORE_SALE' | 'OTHER';
  label: string; title: string | null; planId?: string;
  productName?: string | null; billingInterval?: string; orderId?: string;
};

// Workflow transitions surfaced as header action buttons. Refund opens the modal.
const TRANSITIONS: { action: string; label: string; from: PaymentStatus[]; icon: typeof faCheck }[] = [
  { action: 'authorize', label: 'Authorize', from: ['PENDING'], icon: faLock },
  { action: 'capture', label: 'Capture', from: ['PENDING', 'PROCESSING'], icon: faCheck },
  { action: 'fail', label: 'Mark Failed', from: ['PENDING', 'PROCESSING'], icon: faBan },
];

function fmtMoney(amount: number | string, currency: string) {
  try {
    return new Intl.NumberFormat(currency === 'TRY' ? 'tr-TR' : 'en-US', {
      style: 'currency', currency, minimumFractionDigits: 2,
    }).format(Number(amount));
  } catch { return `${amount} ${currency}`; }
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-text-secondary mb-0.5">{label}</dt>
      <dd className="text-text-primary">{children}</dd>
    </div>
  );
}

export default function PaymentDetailPage({ params }: { params: Promise<{ tenantId: string; paymentId: string }> }) {
  const { tenantId, paymentId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [subject, setSubject] = useState<PaymentSubject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  const load = useCallback(() => {
    api.get(`/tenant/${tenantId}/api/payments/${paymentId}`)
      .then((res) => { setPayment(res.data.payment); setSubject(res.data.subject ?? null); })
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load payment.'))
      .finally(() => setLoading(false));
  }, [tenantId, paymentId]);

  useEffect(() => { load(); }, [load]);

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/payments/${paymentId}/${action}`);
      toast.success(`Payment ${action === 'fail' ? 'marked failed' : `${action}d`}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? `Failed to ${action}.`);
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error || !payment) return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Payments', href: `/tenant/${tenantId}/admin/payments` }, { label: 'Payment' }]} />
      <AlertBanner variant="error" message={error || 'Payment not found.'} />
    </div>
  );

  const md = (payment.metadata ?? {}) as Record<string, unknown>;
  const hasConversion = md.exchangeRate != null && md.originalAmount != null;
  const captured = Number(md.capturedAmount ?? (payment.status === 'COMPLETED' ? payment.amount : 0)) || 0;
  const refunded = Number(md.refundedAmount ?? 0) || 0;

  const workflowActions = TRANSITIONS.filter((t) => t.from.includes(payment.status)).map((t) => ({
    label: <><FontAwesomeIcon icon={t.icon} /> {t.label}</>,
    onClick: () => runTransition(t.action),
    disabled: working,
    variant: 'outline' as const,
  }));
  const refundAction = payment.status === 'COMPLETED'
    ? [{ label: <><FontAwesomeIcon icon={faRotateLeft} /> Refund</>, onClick: () => setShowRefund(true), variant: 'outline' as const }]
    : [];

  const generalContent = (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card title="What this payment is for">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailField label="Type">
              {subject ? <Badge variant="neutral" size="sm">{subject.label}</Badge> : '—'}
            </DetailField>
            {subject?.title && (
              <DetailField label={subject.kind === 'SUBSCRIPTION' ? 'Plan / Product' : subject.kind === 'STORE_SALE' ? 'Order item' : 'Item'}>
                {subject.title}
              </DetailField>
            )}
            {subject?.orderId && (
              <DetailField label="Order ID">
                <span className="font-mono text-xs break-all">{subject.orderId}</span>
              </DetailField>
            )}
            {payment.description && <DetailField label="Description">{payment.description}</DetailField>}
            <DetailField label="Provider">{payment.provider}</DetailField>
            {payment.paymentMethod && <DetailField label="Method">{payment.paymentMethod}</DetailField>}
            <DetailField label="Reference">
              <span className="font-mono text-xs break-all">{payment.providerPaymentId ?? '—'}</span>
            </DetailField>
            {hasConversion && (
              <DetailField label="Currency conversion">
                {fmtMoney(Number(md.originalAmount), String(md.originalCurrency ?? payment.currency))}
                {' → '}
                {fmtMoney(Number(md.chargedAmountTRY ?? payment.amount), 'TRY')}
                <span className="text-text-secondary"> · rate {String(md.exchangeRate)}</span>
              </DetailField>
            )}
          </dl>
        </Card>

        <Card title="Details">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Payment ID', payment.paymentId],
              ['User ID', payment.userId ?? '—'],
              ['Tenant ID', payment.tenantId ?? '—'],
              ['Created', new Date(payment.createdAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-text-secondary mb-0.5">{label}</dt>
                <dd className="font-mono text-xs text-text-primary break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="space-y-4">
        <PaymentSummaryCard payment={payment} type={subject?.label} />
        <Card title="Settlement">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Amount</span>
              <span className="tabular-nums font-semibold text-text-primary">{fmtMoney(payment.amount, payment.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Captured</span>
              <span className="tabular-nums text-text-primary">{fmtMoney(captured, payment.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Refunded</span>
              <span className="tabular-nums text-text-primary">{fmtMoney(refunded, payment.currency)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-text-secondary">Net</span>
              <span className="tabular-nums font-semibold text-text-primary">{fmtMoney(captured - refunded, payment.currency)}</span>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'transactions', label: 'Transactions',
      content: (
        <PaymentTransactionsPanel
          tenantId={tenantId}
          paymentId={paymentId}
          provider={payment.provider}
          currency={payment.currency}
          onRefresh={load}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Payments', href: `/tenant/${tenantId}/admin/payments` },
        { label: payment.paymentId.slice(0, 8) + '…' },
      ]} />

      <PageHeader
        title="Payment Detail"
        subtitle={fmtMoney(payment.amount, payment.currency)}
        badge={<PaymentStatusBadge status={payment.status} dot />}
        actions={[...workflowActions, ...refundAction]}
      />

      <TabGroup tabs={tabs} />

      <PaymentRefundModal
        open={showRefund}
        tenantId={tenantId}
        paymentId={paymentId}
        paymentAmount={payment.amount}
        currency={payment.currency}
        onClose={() => setShowRefund(false)}
        onRefunded={load}
      />
    </div>
  );
}

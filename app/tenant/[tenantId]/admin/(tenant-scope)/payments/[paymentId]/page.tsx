'use client';
import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { isRootTenant } from '@nb/tenant/server/tenant.constants';
import api from '@nb/common/server/axios';
import { Card } from '@nb/common/ui/Card';
import { Badge } from '@nb/common/ui/Badge';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { Breadcrumb } from '@nb/common/ui/Breadcrumb';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/ServerDataTable';
import { PaymentSummaryCard } from '@nb/payment/ui/PaymentSummaryCard';
import { PaymentStatusBadge, type PaymentStatus } from '@nb/payment/ui/PaymentStatusBadge';
import { PaymentRefundModal } from '@nb/payment/ui/PaymentRefundModal';

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

const txStatusVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  COMPLETED: 'success', PENDING: 'warning', FAILED: 'error', REFUNDED: 'neutral',
};

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
  const [error, setError]     = useState('');
  const [showRefund, setShowRefund] = useState(false);

  function loadPayment() {
    api.get(`/tenant/${tenantId}/api/payments/${paymentId}`)
      .then((res) => { setPayment(res.data.payment); setSubject(res.data.subject ?? null); })
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load payment.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPayment(); }, [tenantId, paymentId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error || !payment) return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Payments', href: `/tenant/${tenantId}/admin/payments` }, { label: 'Payment' }]} />
      <AlertBanner variant="error" message={error || 'Payment not found.'} />
    </div>
  );

  const md = (payment.metadata ?? {}) as Record<string, unknown>;
  const hasConversion = md.exchangeRate != null && md.originalAmount != null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Payments', href: `/tenant/${tenantId}/admin/payments` }, { label: payment.paymentId.slice(0, 8) + '…' }]} />

      <PageHeader
        title="Payment Detail"
        subtitle={payment.paymentId}
        badge={<PaymentStatusBadge status={payment.status} dot />}
        actions={payment.status === 'COMPLETED' ? [
          { label: 'Refund', variant: 'outline', onClick: () => setShowRefund(true) },
        ] : []}
      />

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
              {subject?.billingInterval && (
                <DetailField label="Billing">
                  {subject.billingInterval.charAt(0) + subject.billingInterval.slice(1).toLowerCase()}
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
              {hasConversion && (
                <DetailField label="Currency conversion">
                  {fmtMoney(Number(md.originalAmount), String(md.originalCurrency ?? payment.currency))}
                  {' → '}
                  {fmtMoney(Number(md.chargedAmountTRY ?? payment.amount), 'TRY')}
                  <span className="text-text-secondary"> · rate {String(md.exchangeRate)}</span>
                </DetailField>
              )}
              {typeof md.binBank === 'string' && md.binBank && (
                <DetailField label="Card bank">
                  {md.binBank}{typeof md.binCountry === 'string' && md.binCountry ? ` (${md.binCountry})` : ''}
                </DetailField>
              )}
            </dl>
          </Card>

          <ServerDataTable
            columns={[
              { key: 'type',     header: 'Type',     render: (tx) => <Badge variant="neutral" size="sm">{tx.type}</Badge> },
              { key: 'status',   header: 'Status',   render: (tx) => <Badge variant={txStatusVariant[tx.status] ?? 'neutral'} dot size="sm">{tx.status}</Badge> },
              { key: 'amount',   header: 'Amount',   render: (tx) => <span className="tabular-nums font-medium text-text-primary">{tx.amount} {tx.currency}</span> },
              { key: 'provider', header: 'Provider', render: (tx) => <span className="text-text-secondary">{tx.provider}</span> },
              { key: 'createdAt', header: 'Date',    render: (tx) => <span className="text-text-secondary">{new Date(tx.createdAt).toLocaleString()}</span> },
            ] satisfies TableColumn<Transaction>[]}
            rows={payment.transactions ?? []}
            getRowKey={(tx) => tx.transactionId}
            page={1} totalPages={1} onPageChange={() => {}} hidePagination
            title="Transactions"
            subtitle={`${payment.transactions?.length ?? 0} transaction(s)`}
            emptyMessage="No transactions recorded."
          />

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

        <div>
          <PaymentSummaryCard payment={payment} type={subject?.label} />
        </div>
      </div>

      <PaymentRefundModal
        open={showRefund}
        tenantId={tenantId}
        paymentId={paymentId}
        paymentAmount={payment.amount}
        currency={payment.currency}
        onClose={() => setShowRefund(false)}
        onRefunded={loadPayment}
      />
    </div>
  );
}

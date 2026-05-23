'use client';
import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import api from '@/modules_next/common/axios';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import { PaymentSummaryCard } from '@/modules_next/payment/ui/PaymentSummaryCard';
import { PaymentStatusBadge, type PaymentStatus } from '@/modules_next/payment/ui/PaymentStatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons';

type Transaction = {
  transactionId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  createdAt: string;
};

type Payment = {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string;
  paymentMethod?: string | null;
  providerPaymentId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  paidAt?: string | null;
  createdAt: string;
  transactions?: Transaction[];
  userId?: string | null;
  tenantId?: string | null;
};

const txStatusVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  COMPLETED: 'success', PENDING: 'warning', FAILED: 'error', REFUNDED: 'neutral',
};

export default function PaymentDetailPage({ params }: { params: Promise<{ tenantId: string; paymentId: string }> }) {
  const { tenantId, paymentId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [showRefund, setShowRefund]     = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding]       = useState(false);
  const [refundError, setRefundError]   = useState('');

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/payments/${paymentId}`)
      .then((res) => setPayment(res.data.payment))
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load payment.'))
      .finally(() => setLoading(false));
  }, [tenantId, paymentId]);

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    setRefunding(true);
    setRefundError('');
    try {
      await api.post(`/tenant/${tenantId}/api/payments/${paymentId}/refund`, {
        amount: refundAmount ? Number(refundAmount) : undefined,
      });
      const res = await api.get(`/tenant/${tenantId}/api/payments/${paymentId}`);
      setPayment(res.data.payment);
      setShowRefund(false);
      setRefundAmount('');
      toast.success('Refund processed.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setRefundError(err?.response?.data?.message ?? err?.message ?? 'Refund failed.');
    } finally {
      setRefunding(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error || !payment) return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Payments', href: `/tenant/${tenantId}/admin/payments` }, { label: 'Payment' }]} />
      <AlertBanner variant="error" message={error || 'Payment not found.'} />
    </div>
  );

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
            page={1}
            totalPages={1}
            onPageChange={() => {}}
            hidePagination
            title="Transactions"
            subtitle={`${payment.transactions?.length ?? 0} transaction(s)`}
            emptyMessage="No transactions recorded."
          />

          {/* Metadata */}
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

        {/* Sidebar */}
        <div>
          <PaymentSummaryCard payment={payment} />
        </div>
      </div>

      {/* Refund Modal */}
      <Modal
        open={showRefund}
        onClose={() => { setShowRefund(false); setRefundError(''); setRefundAmount(''); }}
        title="Issue Refund"
        description={`Payment of ${payment.amount} ${payment.currency}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRefund(false)} disabled={refunding}>Cancel</Button>
            <Button form="refund-form" type="submit" loading={refunding}
              iconLeft={<FontAwesomeIcon icon={faArrowRotateLeft} />}>
              Refund
            </Button>
          </>
        }
      >
        <form id="refund-form" onSubmit={handleRefund} className="space-y-4">
          {refundError && <AlertBanner variant="error" message={refundError} />}
          <Input
            id="refund-amount"
            label={`Amount (leave empty for full refund of ${payment.amount} ${payment.currency})`}
            type="number"
            min="0.01"
            step="0.01"
            placeholder={String(payment.amount)}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}

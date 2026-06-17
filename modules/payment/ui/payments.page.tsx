'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { PaymentStatusBadge, type PaymentStatus } from '@kuraykaraaslan/payment/ui/payment-status-badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEye, faGear } from '@fortawesome/free-solid-svg-icons';
import type { SafePayment } from '@kuraykaraaslan/payment/server/payment.types';

type Payment = Pick<SafePayment, 'paymentId' | 'amount' | 'currency' | 'provider' | 'customerEmail' | 'customerName' | 'tenantId' | 'userId'> & {
  status: PaymentStatus;
  createdAt: string;
};

const PAGE_SIZE = 20;

const statusOptions = [
  { value: '',                   label: 'All statuses'        },
  { value: 'PENDING',            label: 'Pending'             },
  { value: 'PROCESSING',         label: 'Processing'          },
  { value: 'COMPLETED',          label: 'Completed'           },
  { value: 'FAILED',             label: 'Failed'              },
  { value: 'REFUNDED',           label: 'Refunded'            },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially refunded'  },
  { value: 'CANCELLED',          label: 'Cancelled'           },
  { value: 'EXPIRED',            label: 'Expired'             },
];

const providerOptions = [
  { value: '',        label: 'All providers' },
  { value: 'STRIPE',  label: 'Stripe'        },
  { value: 'PAYPAL',  label: 'PayPal'        },
  { value: 'IYZICO',  label: 'Iyzico'        },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function PaymentsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState('');
  const [provider, setProvider] = useState('');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPayments = useCallback(
    async (p: number, st: string, prov: string) => {
      setLoading(true);
      setFetchError('');
      try {
        const params: Record<string, string | number> = { page: p - 1, pageSize: PAGE_SIZE };
        if (st)   params.status   = st;
        if (prov) params.provider = prov;
        const res = await api.get(`/tenant/${tenantId}/api/payments`, { params });
        setPayments(res.data.payments ?? []);
        setTotal(res.data.total ?? 0);
      } catch (err: unknown) {
        setFetchError(extractMessage(err, 'Failed to load payments.'));
      } finally {
        setLoading(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    setPage(1);
    fetchPayments(1, status, provider);
  }, [status, provider, fetchPayments]);

  useEffect(() => {
    fetchPayments(page, status, provider);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = search
    ? payments.filter(
        (p) =>
          p.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
          p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          p.paymentId.includes(search),
      )
    : payments;

  const columns: TableColumn<Payment>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (p) => (
        <div>
          <p className="font-medium text-text-primary">
            {p.customerName ?? p.customerEmail ?? '—'}
          </p>
          {p.customerName && p.customerEmail && (
            <p className="text-xs text-text-secondary">{p.customerEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => (
        <span className="font-semibold tabular-nums text-text-primary">
          {formatAmount(p.amount, p.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <PaymentStatusBadge status={p.status} dot size="sm" />,
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (p) => <span className="text-text-secondary">{p.provider}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (p) => (
        <span className="text-text-secondary">
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'View',
                icon: <FontAwesomeIcon icon={faEye} />,
                onClick: () => {
                  window.location.href = `/tenant/${tenantId}/admin/payments/${p.paymentId}`;
                },
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
        title="Payments"
        subtitle={loading ? '…' : `${total} total transaction${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/payments/settings`, variant: 'ghost' as const },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(p) => p.paymentId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(p) => {
          window.location.href = `/tenant/${tenantId}/admin/payments/${p.paymentId}`;
        }}
        loading={loading}
        emptyMessage="No payments found."
        toolbar={
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="flex-1 min-w-48">
              <Input
                id="pay-search"
                label="Search"
                placeholder="Search by customer or payment ID…"
                prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="min-w-44">
              <Select
                id="pay-status"
                label="Status"
                options={statusOptions}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
            <div className="min-w-44">
              <Select
                id="pay-provider"
                label="Provider"
                options={providerOptions}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Button } from '@/modules/ui/Button';
import { Input } from '@/modules/ui/Input';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Pagination } from '@/modules/ui/Pagination';
import { PageHeader } from '@/modules/ui/PageHeader';
import { EmptyState } from '@/modules/ui/EmptyState';
import { PaymentStatusBadge, type PaymentStatus } from '@/modules/payment/ui/payment.status-badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCreditCard } from '@fortawesome/free-solid-svg-icons';

type Payment = {
  paymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  customerEmail?: string | null;
  customerName?: string | null;
  createdAt: string;
  tenantId?: string | null;
  userId?: string | null;
};

const PAGE_SIZE = 20;

const selectClass =
  'h-9 rounded-lg border border-border bg-surface-base px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [status, setStatus]     = useState('');
  const [provider, setProvider] = useState('');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetch = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: p, pageSize: PAGE_SIZE };
      if (status)   params.status   = status;
      if (provider) params.provider = provider;
      const res = await api.get('/system/api/admin/payments', { params });
      setPayments(res.data.payments ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [status, provider]);

  useEffect(() => { setPage(0); fetch(0); }, [fetch]);
  useEffect(() => { fetch(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function formatAmount(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
    } catch { return `${amount} ${currency}`; }
  }

  const displayed = search
    ? payments.filter(
        (p) =>
          p.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
          p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          p.paymentId.includes(search),
      )
    : payments;

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle={`${total} total transactions`} />

      {error && <AlertBanner variant="error" message={error} />}

      <Card>
        <div className="flex flex-wrap gap-3 pb-4">
          <Input
            id="pay-search"
            label=""
            placeholder="Search by email or ID…"
            prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="">All statuses</option>
            {['PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED','PARTIALLY_REFUNDED','CANCELLED','EXPIRED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={selectClass}>
            <option value="">All providers</option>
            {['STRIPE','PAYPAL','IYZICO'].map((pr) => (
              <option key={pr} value={pr}>{pr}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Customer', 'Amount', 'Status', 'Provider', 'Date', ''].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayed.map((p) => (
                    <tr key={p.paymentId} className="hover:bg-surface-overlay transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-text-primary">{p.customerName ?? p.customerEmail ?? '—'}</p>
                        {p.customerName && p.customerEmail && (
                          <p className="text-xs text-text-secondary">{p.customerEmail}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold tabular-nums text-text-primary">
                        {formatAmount(p.amount, p.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <PaymentStatusBadge status={p.status} dot size="sm" />
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{p.provider}</td>
                      <td className="px-6 py-4 text-text-secondary">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a href={`/system/admin/payments/${p.paymentId}`}
                          className="text-xs text-primary hover:underline">
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                  {displayed.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          icon={<FontAwesomeIcon icon={faCreditCard} className="w-5 h-5" />}
                          title="No payments found"
                          description="Try adjusting your filters."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center px-6 py-4 border-t border-border -mb-4">
              <Pagination page={page + 1} totalPages={totalPages} onPageChange={(p) => setPage(p - 1)} showFirstLast />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

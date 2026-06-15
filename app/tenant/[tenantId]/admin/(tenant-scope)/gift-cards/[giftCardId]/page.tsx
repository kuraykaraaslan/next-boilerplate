'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Badge } from '@/modules_next/common/ui/Badge';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import type { GiftCard, GiftCardTransaction } from '@/modules/gift_card/gift_card.types';

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function money(minor: number, currency: string): string {
  return `${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}`;
}

const txColumns = (currency: string): TableColumn<GiftCardTransaction>[] => [
  { key: 'createdAt', header: 'Date', render: (t) => new Date(t.createdAt).toLocaleString() },
  { key: 'type', header: 'Type', render: (t) => <Badge variant="neutral">{t.type}</Badge> },
  {
    key: 'amount', header: 'Amount', align: 'right',
    render: (t) => (
      <span className={`tabular-nums font-medium ${t.amount < 0 ? 'text-error' : 'text-success'}`}>
        {t.amount < 0 ? '' : '+'}{money(t.amount, currency)}
      </span>
    ),
  },
  { key: 'balanceAfter', header: 'Balance After', align: 'right', render: (t) => <span className="tabular-nums">{money(t.balanceAfter, currency)}</span> },
];

export default function GiftCardDetailPage({ params }: { params: Promise<{ tenantId: string; giftCardId: string }> }) {
  const { tenantId, giftCardId } = use(params);

  const [card, setCard] = useState<GiftCard | null>(null);
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [cardRes, txRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/gift-cards/${giftCardId}`),
        api.get(`/tenant/${tenantId}/api/gift-cards/${giftCardId}/transactions`),
      ]);
      setCard(cardRes.data.giftCard);
      setTransactions(txRes.data.transactions ?? []);
    } catch (err: unknown) {
      setError(extractMessage(err, 'Failed to load gift card.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, giftCardId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleVoid() {
    try {
      await api.delete(`/tenant/${tenantId}/api/gift-cards/${giftCardId}`);
      toast.success('Gift card voided.');
      fetchAll();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to void gift card.'));
    }
  }

  if (loading) return <div className="p-6 text-text-secondary">Loading…</div>;
  if (error) return <div className="p-6"><AlertBanner variant="error" message={error} /></div>;
  if (!card) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={money(card.initialAmount, card.currency)}
        subtitle={`Gift card · ${card.status.replace('_', ' ')}`}
        actions={card.status !== 'VOID' && card.status !== 'REDEEMED'
          ? [{ label: 'Void', onClick: handleVoid, variant: 'danger' }]
          : []}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Remaining" value={money(card.remainingAmount, card.currency)} />
        <Stat label="Initial" value={money(card.initialAmount, card.currency)} />
        <Stat label="Recipient" value={card.recipientEmail ?? '—'} />
        <Stat label="Expires" value={card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : '—'} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-secondary">Transactions</h2>
        <ServerDataTable
          columns={txColumns(card.currency)}
          rows={transactions}
          getRowKey={(t) => t.giftCardTransactionId}
          page={1}
          totalPages={1}
          total={transactions.length}
          pageSize={transactions.length || 1}
          onPageChange={() => {}}
          loading={false}
          emptyMessage="No transactions yet."
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 font-semibold text-text-primary truncate">{value}</p>
    </div>
  );
}

'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import { GiftCardIssueModal } from '@/modules_next/gift_card/ui/GiftCardIssueModal';
import { buildGiftCardColumns, type GiftCardRow } from '@/modules_next/gift_card/ui/gift-card-list-columns';

const PAGE_SIZE = 25;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function GiftCardsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [cards, setCards]       = useState<GiftCardRow[]>([]);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [issueOpen, setIssueOpen] = useState(false);
  const [revealedCodes, setRevealedCodes] = useState<string[] | null>(null);

  const [voidingCard, setVoidingCard] = useState<GiftCardRow | null>(null);
  const [voiding, setVoiding]         = useState(false);
  const [voidError, setVoidError]     = useState('');

  const [adjustingCard, setAdjustingCard] = useState<GiftCardRow | null>(null);
  const [adjustDelta, setAdjustDelta]     = useState('');
  const [adjusting, setAdjusting]         = useState(false);
  const [adjustError, setAdjustError]     = useState('');

  const fetchCards = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/gift-cards?pageSize=100`);
      setCards(res.data.giftCards ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load gift cards.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  async function handleIssue(payload: Record<string, unknown>) {
    const res = await api.post(`/tenant/${tenantId}/api/gift-cards`, payload);
    const codes: string[] = (res.data.rawCodes ?? []).map((r: { code: string }) => r.code);
    toast.success(`Issued ${codes.length} gift card${codes.length === 1 ? '' : 's'}.`);
    setRevealedCodes(codes);
    fetchCards();
  }

  async function handleVoid() {
    if (!voidingCard) return;
    setVoiding(true); setVoidError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/gift-cards/${voidingCard.giftCardId}`);
      setVoidingCard(null);
      toast.success('Gift card voided.');
      fetchCards();
    } catch (err: unknown) {
      setVoidError(extractMessage(err, 'Failed to void gift card.'));
    } finally {
      setVoiding(false);
    }
  }

  async function handleAdjust() {
    if (!adjustingCard) return;
    const delta = Math.round(parseFloat(adjustDelta) * 100);
    if (!Number.isFinite(delta) || delta === 0) { setAdjustError('Enter a non-zero amount.'); return; }
    setAdjusting(true); setAdjustError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/gift-cards/${adjustingCard.giftCardId}`, { delta });
      setAdjustingCard(null); setAdjustDelta('');
      toast.success('Balance adjusted.');
      fetchCards();
    } catch (err: unknown) {
      setAdjustError(extractMessage(err, 'Failed to adjust balance.'));
    } finally {
      setAdjusting(false);
    }
  }

  const total = cards.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildGiftCardColumns({
    onVoid: (c) => { setVoidError(''); setVoidingCard(c); },
    onAdjust: (c) => { setAdjustError(''); setAdjustDelta(''); setAdjustingCard(c); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gift Cards"
        subtitle="Issue prepaid gift cards and track their redeemable balance."
        actions={[{ label: 'Issue Gift Card', onClick: () => setIssueOpen(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(c) => c.giftCardId}
        onRowClick={(c) => router.push(`/tenant/${tenantId}/admin/gift-cards/${c.giftCardId}`)}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No gift cards yet."
      />

      <GiftCardIssueModal open={issueOpen} onClose={() => setIssueOpen(false)} onSave={handleIssue} />

      <Modal
        open={!!revealedCodes}
        onClose={() => setRevealedCodes(null)}
        title="Gift Card Codes"
        description="Copy these now — codes are shown only once and cannot be retrieved later."
        footer={<Button onClick={() => setRevealedCodes(null)}>Done</Button>}
      >
        <div className="space-y-2">
          {revealedCodes?.map((code) => (
            <p key={code} className="font-mono font-semibold tracking-wide rounded-md bg-surface-subtle px-3 py-2">
              {code}
            </p>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!voidingCard}
        onClose={() => { setVoidingCard(null); setVoidError(''); }}
        title="Void Gift Card"
        description="Voiding forfeits the remaining balance. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setVoidingCard(null); setVoidError(''); }} disabled={voiding}>Cancel</Button>
            <Button variant="danger" onClick={handleVoid} loading={voiding}>Void</Button>
          </>
        }
      >
        {voidError && <AlertBanner variant="error" message={voidError} />}
      </Modal>

      <Modal
        open={!!adjustingCard}
        onClose={() => { setAdjustingCard(null); setAdjustError(''); }}
        title="Adjust Balance"
        description="Enter a signed amount (major units) to add to or subtract from the remaining balance."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAdjustingCard(null); setAdjustError(''); }} disabled={adjusting}>Cancel</Button>
            <Button onClick={handleAdjust} loading={adjusting}>Apply</Button>
          </>
        }
      >
        <div className="space-y-3">
          {adjustError && <AlertBanner variant="error" message={adjustError} />}
          <Input id="gc-adjust-delta" label="Delta" type="number" step="0.01" placeholder="-10.00 or 25.00"
            value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

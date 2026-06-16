'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@nb/common/ui/Button';
import api from '@nb/common/server/axios';

type RenderedAgreement = {
  type: string;
  title: string;
  content: string;
  contentHash: string;
  versionLabel: string | null;
};

export interface AcceptanceGateOrder {
  orderRef: string;
  currency: string;
  total: number;
  items?: { name: string; quantity: number; unitPrice: number; total?: number }[];
  buyer?: { name?: string; email?: string; phone?: string; address?: string };
  orderDate?: string;
}

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/**
 * Checkout legal gate. Renders the tenant's order-specific agreements
 * (distance-selling, pre-information, …) for an order, requires the buyer to read
 * + accept each, records acceptance (server stores the exact text verbatim), then
 * calls `onAccepted`. Render this before enabling the "Pay" button; pass the same
 * `order.orderRef` to the payment so the server-side gate matches.
 */
export function AcceptanceGate({
  tenantId,
  order,
  subject,
  onAccepted,
}: {
  tenantId: string;
  order: AcceptanceGateOrder;
  subject: { userId?: string; anonymousId?: string };
  onAccepted?: () => void;
}) {
  const [agreements, setAgreements] = useState<RenderedAgreement[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/checkout/agreements`, { order });
      setAgreements(res.data.agreements ?? []);
    } catch (err: unknown) {
      setError(extractMessage(err, 'Failed to load the agreements.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, order]);

  useEffect(() => {
    load();
  }, [load]);

  const allChecked = agreements.length > 0 && agreements.every((a) => checked[a.type]);

  async function accept() {
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/tenant/${tenantId}/api/checkout/agreements/accept`, {
        order,
        userId: subject.userId,
        anonymousId: subject.anonymousId,
      });
      setDone(true);
      onAccepted?.();
    } catch (err: unknown) {
      setError(extractMessage(err, 'Failed to record your acceptance.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-sm text-text-secondary">Loading agreements…</div>;
  if (agreements.length === 0) return null; // tenant requires no checkout agreements

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      {agreements.map((a) => (
        <div key={a.type} className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={!!checked[a.type]}
              disabled={done}
              onChange={(e) => setChecked((c) => ({ ...c, [a.type]: e.target.checked }))}
            />
            <span className="text-text-primary">
              I have read and accept the{' '}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setOpen((o) => ({ ...o, [a.type]: !o[a.type] }))}
              >
                {a.title}
              </button>
              {a.versionLabel && <span className="text-text-secondary"> (v{a.versionLabel})</span>}
            </span>
          </label>
          {open[a.type] && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-sunken p-3 text-xs text-text-secondary">
              {a.content}
            </pre>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-error">{error}</p>}

      <Button variant="primary" disabled={!allChecked || submitting || done} onClick={accept}>
        {done ? 'Agreements accepted' : 'Accept & continue'}
      </Button>
    </div>
  );
}

export default AcceptanceGate;

'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader, type PageHeaderAction } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { Button } from '@/modules_next/common/ui/Button';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { toast } from '@/modules_next/common/ui/toast.store';
import type { SafeInvoice, SafeInvoiceLine } from '@/modules/invoice/invoice.types';

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  draft: 'neutral',
  issued: 'info',
  paid: 'success',
  void: 'error',
  refunded: 'warning',
};

/** e-Arşiv sub-status, shown alongside the main status for TR invoices. */
const EARSIV_LABEL: Record<string, string> = {
  submitted: 'e-Arşiv · awaiting signature',
  accepted: 'e-Arşiv · signed',
  rejected: 'e-Arşiv · rejected',
};

const fmtDate = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString() : '—');

export default function TenantInvoiceDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string; invoiceId: string }>;
}) {
  const { tenantId, invoiceId } = use(params);
  const [invoice, setInvoice] = useState<SafeInvoice | null>(null);
  const [lines, setLines] = useState<SafeInvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Void confirmation modal
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/tenant/${tenantId}/api/invoices/${invoiceId}`)
      .then((res) => {
        setInvoice(res.data.invoice);
        setLines(res.data.lines ?? []);
      })
      .catch((e) => {
        if (e.response?.status === 404) setNotFoundError(true);
        else setError(e.response?.data?.message ?? 'Failed to load the invoice');
      })
      .finally(() => setLoading(false));
  }, [tenantId, invoiceId]);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(
    async (key: string, path: string, body?: Record<string, unknown>, successMsg?: string) => {
      setBusy(key);
      setError(null);
      try {
        const res = await api.post(`/tenant/${tenantId}/api/invoices/${invoiceId}/${path}`, body ?? {});
        if (res.data.invoice) setInvoice(res.data.invoice);
        else load();
        if (successMsg) toast.success(successMsg);
      } catch (e: any) {
        const msg = e.response?.data?.message ?? 'Action failed';
        setError(msg);
        toast.error(msg);
      } finally {
        setBusy(null);
      }
    },
    [tenantId, invoiceId, load],
  );

  const confirmVoid = useCallback(async () => {
    await runAction('void', 'void', voidReason ? { reason: voidReason } : undefined, 'Invoice voided.');
    setVoidOpen(false);
    setVoidReason('');
  }, [runAction, voidReason]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFoundError || !invoice) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Admin', href: `/tenant/${tenantId}/admin` },
            { label: 'Invoices', href: `/tenant/${tenantId}/admin/invoices` },
            { label: 'Not found' },
          ]}
        />
        <AlertBanner
          variant="error"
          message="Invoice not found. It may have been deleted, or belongs to another tenant."
          action={{ label: 'Back to invoices', onClick: () => { window.location.href = `/tenant/${tenantId}/admin/invoices`; } }}
        />
      </div>
    );
  }

  const isTR = invoice.region === 'TR';
  const canIssue = invoice.status === 'draft';
  const canMarkPaid = invoice.status === 'issued';
  const canVoid = invoice.status === 'draft' || invoice.status === 'issued';

  const actions: PageHeaderAction[] = [
    {
      label: 'Download PDF',
      variant: 'outline',
      onClick: () => window.open(`/tenant/${tenantId}/api/invoices/${invoiceId}/pdf`, '_blank'),
    },
  ];
  if (canIssue) {
    actions.push({
      label: busy === 'issue' ? 'Issuing…' : isTR ? 'Issue e-Arşiv' : 'Issue',
      variant: 'primary',
      disabled: busy !== null,
      onClick: () =>
        runAction(
          'issue',
          'issue',
          undefined,
          isTR
            ? 'Invoice issued — a GİB e-Arşiv draft was created. Sign it via SMS from the invoices list.'
            : 'Invoice issued.',
        ),
    });
  }
  if (canMarkPaid) {
    actions.push({
      label: busy === 'mark-paid' ? 'Saving…' : 'Mark paid',
      variant: 'secondary',
      disabled: busy !== null,
      onClick: () => runAction('mark-paid', 'mark-paid', undefined, 'Invoice marked as paid.'),
    });
  }
  if (canVoid) {
    actions.push({
      label: 'Void',
      variant: 'danger',
      disabled: busy !== null,
      onClick: () => setVoidOpen(true),
    });
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: `/tenant/${tenantId}/admin` },
          { label: 'Invoices', href: `/tenant/${tenantId}/admin/invoices` },
          { label: invoice.invoiceNumber },
        ]}
      />

      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`${invoice.customerName} · ${invoice.customerEmail}`}
        badge={
          <span className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[invoice.status] ?? 'neutral'}>{invoice.status}</Badge>
            {isTR && invoice.earsivStatus && (
              <Badge variant="neutral" size="sm">
                {EARSIV_LABEL[invoice.earsivStatus] ?? `e-Arşiv: ${invoice.earsivStatus}`}
              </Badge>
            )}
          </span>
        }
        actions={actions}
      />

      {error && <AlertBanner key={`e-${error}`} variant="error" message={error} dismissible />}

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Customer">
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={invoice.customerName} />
            <Row label="Email" value={invoice.customerEmail} />
            <Row label="Tax ID" value={invoice.customerTaxId ?? '—'} />
            <Row label="Country" value={invoice.customerCountryCode} />
          </dl>
        </Card>

        <Card title="Details">
          <dl className="space-y-2 text-sm">
            <Row label="Issue date" value={fmtDate(invoice.issueDate)} />
            <Row label="Due date" value={fmtDate(invoice.dueDate)} />
            <Row label="Paid at" value={fmtDate(invoice.paidAt)} />
            <Row label="Region" value={invoice.region} />
            <Row label="Tax scheme" value={invoice.taxScheme} />
            {invoice.earsivUuid && <Row label="e-Arşiv UUID" value={<span className="font-mono text-xs">{invoice.earsivUuid}</span>} />}
            {invoice.peppolDocumentId && <Row label="Peppol ID" value={<span className="font-mono text-xs">{invoice.peppolDocumentId}</span>} />}
          </dl>
        </Card>
      </div>

      <Card title={`Line items (${lines.length})`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-text-secondary">
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4 text-right">Qty</th>
                <th className="py-2 pr-4 text-right">Unit price</th>
                <th className="py-2 pr-4 text-right">Tax</th>
                <th className="py-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.invoiceLineId} className="border-b border-border/60">
                  <td className="py-2 pr-4">
                    <div>{line.description}</div>
                    {line.sourceType && (
                      <div className="text-xs text-text-secondary">{line.sourceType}</div>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">{line.quantity}</td>
                  <td className="py-2 pr-4 text-right font-mono">{line.unitPrice.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right font-mono">
                    {(line.taxRate * 100).toFixed(0)}% · {line.taxAmount.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-mono">{line.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1 text-sm">
            <Row label="Subtotal" value={<span className="font-mono">{invoice.subtotal.toFixed(2)} {invoice.currency}</span>} />
            {invoice.discountAmount > 0 && (
              <Row label="Discount" value={<span className="font-mono">−{invoice.discountAmount.toFixed(2)} {invoice.currency}</span>} />
            )}
            <Row label="Tax" value={<span className="font-mono">{invoice.taxAmount.toFixed(2)} {invoice.currency}</span>} />
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>Total</span>
              <span className="font-mono">{invoice.totalAmount.toFixed(2)} {invoice.currency}</span>
            </div>
          </dl>
        </div>
      </Card>

      {invoice.notes && (
        <Card title="Notes">
          <p className="whitespace-pre-wrap text-sm text-text-secondary">{invoice.notes}</p>
        </Card>
      )}

      <Modal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        title="Void this invoice?"
        description="Voiding marks the invoice as cancelled. This cannot be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setVoidOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={busy === 'void'} onClick={confirmVoid}>Void invoice</Button>
          </div>
        }
      >
        <Input
          id="voidReason"
          label="Reason (optional)"
          value={voidReason}
          placeholder="e.g. Issued in error"
          onChange={(e) => setVoidReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right text-text-primary">{value}</dd>
    </div>
  );
}

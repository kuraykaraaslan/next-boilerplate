'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader, type PageHeaderAction } from '@kuraykaraaslan/common/ui/page-header.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { InvoiceLineItemsTable, Row } from '@kuraykaraaslan/invoice/ui/invoice-line-items-table.component';
import type { SafeInvoice, SafeInvoiceLine } from '@kuraykaraaslan/invoice/server/invoice.types';

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  draft: 'neutral', issued: 'info', paid: 'success', void: 'error', refunded: 'warning',
};

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
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/tenant/${tenantId}/api/invoices/${invoiceId}`)
      .then((res) => { setInvoice(res.data.invoice); setLines(res.data.lines ?? []); })
      .catch((e) => {
        if (e.response?.status === 404) setNotFoundError(true);
        else setError(e.response?.data?.message ?? 'Failed to load the invoice');
      })
      .finally(() => setLoading(false));
  }, [tenantId, invoiceId]);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(
    async (key: string, path: string, body?: Record<string, unknown>, successMsg?: string) => {
      setBusy(key); setError(null);
      try {
        const res = await api.post(`/tenant/${tenantId}/api/invoices/${invoiceId}/${path}`, body ?? {});
        if (res.data.invoice) setInvoice(res.data.invoice); else load();
        if (successMsg) toast.success(successMsg);
      } catch (e: any) {
        const msg = e.response?.data?.message ?? 'Action failed';
        setError(msg); toast.error(msg);
      } finally { setBusy(null); }
    },
    [tenantId, invoiceId, load],
  );

  const confirmVoid = useCallback(async () => {
    await runAction('void', 'void', voidReason ? { reason: voidReason } : undefined, 'Invoice voided.');
    setVoidOpen(false); setVoidReason('');
  }, [runAction, voidReason]);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>;
  }

  if (notFoundError || !invoice) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: 'Admin', href: `/tenant/${tenantId}/admin` },
          { label: 'Invoices', href: `/tenant/${tenantId}/admin/invoices` },
          { label: 'Not found' },
        ]} />
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
    { label: 'Download PDF', variant: 'outline', onClick: () => window.open(`/tenant/${tenantId}/api/invoices/${invoiceId}/pdf`, '_blank') },
  ];
  if (canIssue) actions.push({
    label: busy === 'issue' ? 'Issuing…' : isTR ? 'Issue e-Arşiv' : 'Issue',
    variant: 'primary', disabled: busy !== null,
    onClick: () => runAction('issue', 'issue', undefined, isTR ? 'Invoice issued — a GİB e-Arşiv draft was created. Sign it via SMS from the invoices list.' : 'Invoice issued.'),
  });
  if (canMarkPaid) actions.push({
    label: busy === 'mark-paid' ? 'Saving…' : 'Mark paid',
    variant: 'secondary', disabled: busy !== null,
    onClick: () => runAction('mark-paid', 'mark-paid', undefined, 'Invoice marked as paid.'),
  });
  if (canVoid) actions.push({ label: 'Void', variant: 'danger', disabled: busy !== null, onClick: () => setVoidOpen(true) });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Admin', href: `/tenant/${tenantId}/admin` },
        { label: 'Invoices', href: `/tenant/${tenantId}/admin/invoices` },
        { label: invoice.invoiceNumber },
      ]} />

      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`${invoice.customerName} · ${invoice.customerEmail}`}
        badge={
          <span className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[invoice.status] ?? 'neutral'}>{invoice.status}</Badge>
            {isTR && invoice.earsivStatus && (
              <Badge variant="neutral" size="sm">{EARSIV_LABEL[invoice.earsivStatus] ?? `e-Arşiv: ${invoice.earsivStatus}`}</Badge>
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

      <InvoiceLineItemsTable
        lines={lines}
        subtotal={invoice.subtotal}
        discountAmount={invoice.discountAmount}
        taxAmount={invoice.taxAmount}
        totalAmount={invoice.totalAmount}
        currency={invoice.currency}
      />

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

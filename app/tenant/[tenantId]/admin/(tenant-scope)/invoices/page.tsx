'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { Button } from '@/modules_next/common/ui/Button';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import type { SafeInvoice } from '@/modules/invoice/invoice.types';

type InvoiceRow = Pick<SafeInvoice, 'invoiceId' | 'invoiceNumber' | 'customerName' | 'customerEmail' | 'totalAmount' | 'currency' | 'status' | 'region' | 'earsivStatus' | 'earsivUuid'> & {
  issueDate: string;
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-text-secondary/10 text-text-secondary',
  issued: 'bg-info-subtle text-info-fg',
  paid: 'bg-success-subtle text-success-fg',
  void: 'bg-error-subtle text-error-fg',
  refunded: 'bg-warning-subtle text-warning-fg',
};

/** e-Arşiv sub-status, shown under the main status for TR invoices. */
const EARSIV_LABEL: Record<string, string> = {
  submitted: 'e-Arşiv · awaiting signature',
  accepted: 'e-Arşiv · signed',
  rejected: 'e-Arşiv · rejected',
};

export default function TenantInvoicesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // SMS signing modal
  const [signOpen, setSignOpen] = useState(false);
  const [oid, setOid] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [signBusy, setSignBusy] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/tenant/${tenantId}/api/invoices?pageSize=50`)
      .then((res) => setInvoices(res.data.invoices ?? []))
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  // TR e-Arşiv drafts created at GİB but not yet legally signed.
  const unsigned = invoices.filter((i) => i.region === 'TR' && i.earsivStatus === 'submitted');

  // Issue a draft → submits to the regional adapter (TR: creates the GİB e-Arşiv draft).
  const generate = useCallback(async (invoiceId: string) => {
    setBusyId(invoiceId);
    setError(null);
    setNotice(null);
    try {
      await api.post(`/tenant/${tenantId}/api/invoices/${invoiceId}/issue`);
      setNotice('Invoice issued. For Turkey, a GİB e-Arşiv draft was created — use “Sign via SMS” to finalize it.');
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to issue the invoice');
    } finally {
      setBusyId(null);
    }
  }, [tenantId, load]);

  const openSign = useCallback(() => {
    setSignOpen(true);
    setOid(null);
    setCode('');
    setSignError(null);
  }, []);

  const sendCode = useCallback(async () => {
    setSignBusy(true);
    setSignError(null);
    try {
      const res = await api.post(`/tenant/${tenantId}/api/invoices/earsiv/sms/send`);
      setOid(res.data.oid);
    } catch (e: any) {
      setSignError(e.response?.data?.message ?? 'SMS kodu gönderilemedi');
    } finally {
      setSignBusy(false);
    }
  }, [tenantId]);

  const verifyCode = useCallback(async () => {
    if (!oid || !code) return;
    setSignBusy(true);
    setSignError(null);
    try {
      const res = await api.post(`/tenant/${tenantId}/api/invoices/earsiv/sms/verify`, { oid, code });
      setSignOpen(false);
      setNotice(`${res.data.signed ?? 0} e-Arşiv invoice(s) signed.`);
      load();
    } catch (e: any) {
      setSignError(e.response?.data?.message ?? 'Could not verify the code');
    } finally {
      setSignBusy(false);
    }
  }, [tenantId, oid, code, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: `/tenant/${tenantId}/admin` },
          { label: 'Invoices' },
        ]}
      />

      <PageHeader
        title="Invoices"
        subtitle="Issued documents — TR e-Arşiv / EU Peppol / US Stripe Tax driven by Settings → Integrations → Invoicing."
      />

      {error && <AlertBanner key={`e-${error}`} variant="error" message={error} dismissible />}
      {notice && <AlertBanner key={`n-${notice}`} variant="success" message={notice} dismissible />}

      {unsigned.length > 0 && (
        <AlertBanner
          variant="warning"
          message={`${unsigned.length} e-Arşiv invoice${unsigned.length === 1 ? '' : 's'} awaiting signature at GİB. Sign via SMS to finalize.`}
          action={{ label: 'Sign via SMS', onClick: openSign }}
        />
      )}

      <Card title={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}>
        {invoices.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No invoices yet. They are auto-issued on every Stripe renewal and can be created manually via the API.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-text-secondary">
                  <th className="py-2 pr-4">Number</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Issue Date</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.invoiceId} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{inv.customerName}</div>
                      <div className="text-xs text-text-secondary">{inv.customerEmail}</div>
                    </td>
                    <td className="py-2 pr-4 text-xs">{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td className="py-2 pr-4 text-xs">{inv.region}</td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {inv.totalAmount.toFixed(2)} {inv.currency}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-md px-2 py-0.5 text-xs ${STATUS_COLOR[inv.status] ?? ''}`}>
                        {inv.status}
                      </span>
                      {inv.region === 'TR' && inv.earsivStatus && (
                        <div className="mt-1 text-[11px] text-text-secondary">{EARSIV_LABEL[inv.earsivStatus] ?? `e-Arşiv: ${inv.earsivStatus}`}</div>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={busyId === inv.invoiceId}
                            onClick={() => generate(inv.invoiceId)}
                          >
                            {inv.region === 'TR' ? 'Issue e-Arşiv' : 'Issue'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            window.location.href = `/tenant/${tenantId}/admin/invoices/${inv.invoiceId}`;
                          }}
                        >
                          Open
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={signOpen}
        onClose={() => setSignOpen(false)}
        title="Sign e-Arşiv invoices via SMS"
        description="GİB sends a one-time code to your registered phone to legally finalize the created e-Arşiv drafts."
        footer={
          oid ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSignOpen(false)}>Cancel</Button>
              <Button loading={signBusy} disabled={!code} onClick={verifyCode}>Verify &amp; sign</Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSignOpen(false)}>Cancel</Button>
              <Button loading={signBusy} onClick={sendCode}>Send code</Button>
            </div>
          )
        }
      >
        <div className="space-y-3">
          {signError && <AlertBanner variant="error" message={signError} />}
          <p className="text-sm text-text-secondary">
            {unsigned.length} draft{unsigned.length === 1 ? '' : 's'} will be signed.
          </p>
          {oid && (
            <Input
              id="earsivSmsCode"
              label="SMS code"
              value={code}
              inputMode="numeric"
              placeholder="6-digit code"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

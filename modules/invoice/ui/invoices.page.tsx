'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { ServerDataTable } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { EarsivSmsSignModal } from '@kuraykaraaslan/invoice/ui/earsiv-sms-sign-modal.component';
import { buildInvoiceColumns, type InvoiceRow } from '@kuraykaraaslan/invoice/ui/invoice-list-columns.component';

const PAGE_SIZE = 25;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function TenantInvoicesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/tenant/${tenantId}/api/invoices?pageSize=50`)
      .then((res) => setInvoices(res.data.invoices ?? []))
      .catch((e: unknown) => setError(extractMessage(e, 'Failed to load invoices')))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const unsigned = invoices.filter((i) => i.region === 'TR' && i.earsivStatus === 'submitted');

  const generate = useCallback(async (invoiceId: string) => {
    setBusyId(invoiceId);
    setError(null);
    setNotice(null);
    try {
      await api.post(`/tenant/${tenantId}/api/invoices/${invoiceId}/issue`);
      setNotice('Invoice issued. For Turkey, a GİB e-Arşiv draft was created — use "Sign via SMS" to finalize it.');
      load();
    } catch (e: unknown) {
      setError(extractMessage(e, 'Failed to issue the invoice'));
    } finally {
      setBusyId(null);
    }
  }, [tenantId, load]);

  const total = invoices.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildInvoiceColumns({
    busyId,
    onGenerate: generate,
    onOpen: (invoiceId) => router.push(`/tenant/${tenantId}/admin/invoices/${invoiceId}`),
  });

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
          action={{ label: 'Sign via SMS', onClick: () => setSignOpen(true) }}
        />
      )}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(inv) => inv.invoiceId}
        onRowClick={(inv) => router.push(`/tenant/${tenantId}/admin/invoices/${inv.invoiceId}`)}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No invoices yet. They are auto-issued on every Stripe renewal and can be created manually via the API."
      />

      <EarsivSmsSignModal
        open={signOpen}
        tenantId={tenantId}
        unsignedCount={unsigned.length}
        onClose={() => setSignOpen(false)}
        onSigned={(count) => {
          setSignOpen(false);
          setNotice(`${count} e-Arşiv invoice(s) signed.`);
          load();
        }}
      />
    </div>
  );
}

'use client';
import { use, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { Button } from '@/modules_next/common/ui/Button';
import type { SafeInvoice } from '@/modules/invoice/invoice.types';

type InvoiceRow = Pick<SafeInvoice, 'invoiceId' | 'invoiceNumber' | 'customerName' | 'customerEmail' | 'totalAmount' | 'currency' | 'status' | 'region'> & {
  issueDate: string;
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-text-secondary/10 text-text-secondary',
  issued: 'bg-info-subtle text-info-fg',
  paid: 'bg-success-subtle text-success-fg',
  void: 'bg-error-subtle text-error-fg',
  refunded: 'bg-warning-subtle text-warning-fg',
};

export default function TenantInvoicesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/tenant/${tenantId}/api/invoices?pageSize=50`)
      .then((res) => setInvoices(res.data.invoices ?? []))
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [tenantId]);

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

      {error && <AlertBanner variant="error" message={error} />}

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
                    </td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          window.location.href = `/tenant/${tenantId}/admin/invoices/${inv.invoiceId}`;
                        }}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

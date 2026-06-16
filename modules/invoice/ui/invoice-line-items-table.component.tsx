'use client';
import { Card } from '@nb/common/ui/card.component';
import type { SafeInvoiceLine } from '@nb/invoice/server/invoice.types';

interface Props {
  lines: SafeInvoiceLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

export function InvoiceLineItemsTable({ lines, subtotal, discountAmount, taxAmount, totalAmount, currency }: Props) {
  return (
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
          <Row label="Subtotal" value={<span className="font-mono">{subtotal.toFixed(2)} {currency}</span>} />
          {discountAmount > 0 && (
            <Row label="Discount" value={<span className="font-mono">−{discountAmount.toFixed(2)} {currency}</span>} />
          )}
          <Row label="Tax" value={<span className="font-mono">{taxAmount.toFixed(2)} {currency}</span>} />
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total</span>
            <span className="font-mono">{totalAmount.toFixed(2)} {currency}</span>
          </div>
        </dl>
      </div>
    </Card>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right text-text-primary">{value}</dd>
    </div>
  );
}

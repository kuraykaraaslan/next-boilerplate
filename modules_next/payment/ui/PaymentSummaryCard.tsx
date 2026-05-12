'use client';
// Adapted from next_components: PaymentSummaryCard + PriceDisplay
import { cn } from '@/libs/utils/cn';
import { PaymentStatusBadge, type PaymentStatus } from './PaymentStatusBadge';

type PaymentSummaryCardProps = {
  payment: {
    paymentId: string;
    status: PaymentStatus;
    amount: number | string;
    currency: string;
    provider: string;
    paymentMethod?: string | null;
    providerPaymentId?: string | null;
    customerEmail?: string | null;
    customerName?: string | null;
    createdAt?: string | null;
    paidAt?: string | null;
  };
  className?: string;
};

const METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD:   'Credit Card',
  DEBIT_CARD:    'Debit Card',
  BANK_TRANSFER: 'Bank Transfer',
  PAYPAL:        'PayPal',
  APPLE_PAY:     'Apple Pay',
  GOOGLE_PAY:    'Google Pay',
  OTHER:         'Other',
};

function formatAmount(amount: number | string, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

export function PaymentSummaryCard({ payment, className }: PaymentSummaryCardProps) {
  return (
    <div className={cn('bg-surface-raised border border-border rounded-xl overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-overlay">
        <span className="text-sm font-semibold text-text-primary">Payment</span>
        <PaymentStatusBadge status={payment.status} size="sm" dot />
      </div>
      <div className="px-4 py-4 space-y-3 text-sm">
        <Row label="Amount">
          <span className="text-xl font-semibold text-text-primary tabular-nums">
            {formatAmount(payment.amount, payment.currency)}
          </span>
        </Row>
        {payment.paymentMethod && (
          <Row label="Method">{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</Row>
        )}
        <Row label="Provider">{payment.provider}</Row>
        {payment.customerName && <Row label="Customer">{payment.customerName}</Row>}
        {payment.customerEmail && <Row label="Email">{payment.customerEmail}</Row>}
        {payment.providerPaymentId && (
          <Row label="Ref">
            <span className="font-mono text-xs text-text-secondary truncate">{payment.providerPaymentId}</span>
          </Row>
        )}
        {payment.paidAt && (
          <Row label="Paid at">{new Date(payment.paidAt).toLocaleString()}</Row>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-secondary shrink-0">{label}</span>
      <span className="text-text-primary font-medium text-right">{children}</span>
    </div>
  );
}

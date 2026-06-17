'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import api from '@kuraykaraaslan/common/server/axios';
import { CreditCardForm } from './credit-card-form.component';
import type { CreditCardInput } from '@kuraykaraaslan/payment/server/payment.enums';

type Plan = {
  planId: string;
  name: string;
  basePrice: number;
  currency: string;
};

type Quote = {
  baseAmount: number;
  baseCurrency: string;
  isTurkish: boolean;
  chargedAmount: number;
  chargedCurrency: string;
  exchangeRate: number | null;
  brand: string | null;
  bankName: string | null;
};

type PayResult = {
  paymentId: string;
  chargedAmount: number;
  chargedCurrency: string;
  exchangeRate: number | null;
};

type CardCheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  plan: Plan | null;
  /** Provider to charge through — must support direct card payment (e.g. IYZICO). */
  provider: string;
  customerEmail?: string;
  customerName?: string;
  onSuccess: (result: PayResult) => void;
};

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === 'TRY' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function CardCheckoutModal({
  open,
  onClose,
  tenantId,
  plan,
  provider,
  customerEmail,
  customerName,
  onSuccess,
}: CardCheckoutModalProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset transient state whenever the modal is closed.
  useEffect(() => {
    if (!open) {
      setQuote(null);
      setQuoting(false);
      setError('');
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [open]);

  const handleBinChange = useCallback((bin: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!plan || bin.length < 6) {
      setQuote(null);
      setQuoting(false);
      return;
    }
    setQuoting(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.post<Quote & { success: boolean }>(
          `/tenant/${tenantId}/api/subscription/quote`,
          { planId: plan.planId, bin, provider },
        );
        setQuote(res.data);
      } catch {
        setQuote(null); // best-effort; the real amount is resolved server-side on pay
      } finally {
        setQuoting(false);
      }
    }, 400);
  }, [plan, provider, tenantId]);

  async function handleSubmit(card: CreditCardInput) {
    if (!plan) return;
    setError('');
    try {
      const res = await api.post<PayResult & { success: boolean; requires3ds?: boolean; htmlContent?: string }>(
        `/tenant/${tenantId}/api/subscription/pay`,
        { planId: plan.planId, card, provider, customerEmail, customerName },
      );

      // 3DS required: render the bank's self-submitting form (full-page redirect).
      // The bank returns to our 3ds-callback, which redirects back to this page.
      if (res.data.requires3ds && res.data.htmlContent) {
        const html = atob(res.data.htmlContent);
        document.open();
        document.write(html);
        document.close();
        return;
      }

      onSuccess(res.data);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message ?? 'Card payment failed. Please try again.');
    }
  }

  const basePriceLabel = plan ? formatPrice(plan.basePrice, plan.currency) : '';

  const quoteLine = (() => {
    if (!plan) return null;
    if (quoting) {
      return <p className="text-sm text-text-secondary">Checking card…</p>;
    }
    if (quote && quote.isTurkish && quote.chargedCurrency === 'TRY') {
      return (
        <div className="rounded-lg bg-primary-subtle px-3 py-2 text-sm">
          <p className="font-medium text-text-primary">
            Turkish card detected — you will be charged {formatPrice(quote.chargedAmount, 'TRY')}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {formatPrice(quote.baseAmount, quote.baseCurrency)}
            {quote.exchangeRate != null && ` × ${quote.exchangeRate.toFixed(4)} (TCMB)`}
            {quote.bankName && ` · ${quote.bankName}`}
          </p>
        </div>
      );
    }
    return (
      <p className="text-sm text-text-secondary">
        Total: <span className="font-medium text-text-primary">{quote ? formatPrice(quote.chargedAmount, quote.chargedCurrency) : basePriceLabel}</span>
      </p>
    );
  })();

  return (
    <Modal open={open} onClose={onClose} title={plan ? `Pay for ${plan.name}` : 'Pay'} size="md">
      <CreditCardForm
        onSubmit={handleSubmit}
        onCancel={onClose}
        error={error}
        submitLabel={quote ? `Pay ${formatPrice(quote.chargedAmount, quote.chargedCurrency)}` : 'Pay'}
        onBinChange={handleBinChange}
        quoteSlot={quoteLine}
      />
    </Modal>
  );
}

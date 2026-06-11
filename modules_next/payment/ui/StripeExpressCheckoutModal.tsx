'use client';
import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import api from '@/modules_next/common/axios';

type Plan = { planId: string; name: string };

type Intent = {
  paymentId: string;
  clientSecret: string;
  publishableKey: string | null;
  amount: number;
  currency: string;
};

/** Inner form — must live under <Elements> to use the Stripe hooks. */
function ExpressForm({
  clientSecret,
  onPaid,
  onError,
}: {
  clientSecret: string;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [empty, setEmpty] = useState(false);

  async function onConfirm() {
    if (!stripe || !elements) return;
    // Surfaces the wallet sheet, then confirms the PaymentIntent. `if_required`
    // means it only redirects for methods that truly need it (most wallets don't).
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message ?? 'Payment failed. Please try again.');
      return;
    }
    onPaid();
  }

  return (
    <div className="space-y-3">
      <ExpressCheckoutElement
        onConfirm={onConfirm}
        onReady={(e) => setEmpty(!e.availablePaymentMethods)}
      />
      {empty && (
        <p className="text-sm text-text-secondary">
          No wallet payment methods are available on this device/browser.
        </p>
      )}
    </div>
  );
}

export function StripeExpressCheckoutModal({
  open,
  onClose,
  tenantId,
  plan,
  customerEmail,
  customerName,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  plan: Plan | null;
  customerEmail?: string;
  customerName?: string;
  onSuccess: () => void;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !plan) {
      setIntent(null);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await api.post<Intent & { success: boolean }>(
          `/tenant/${tenantId}/api/subscription/payment-intent`,
          { planId: plan.planId, provider: 'STRIPE', customerEmail, customerName },
        );
        if (!cancelled) setIntent(res.data);
      } catch (e) {
        const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (!cancelled) setError(message ?? 'Could not start checkout.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, plan, tenantId, customerEmail, customerName]);

  const stripePromise = useMemo<Promise<Stripe | null> | null>(
    () => (intent?.publishableKey ? loadStripe(intent.publishableKey) : null),
    [intent?.publishableKey],
  );

  async function finalize() {
    if (!intent) return;
    try {
      await api.post(`/tenant/${tenantId}/api/subscription/payment-intent/confirm`, {
        paymentId: intent.paymentId,
        provider: 'STRIPE',
      });
      onSuccess();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message ?? 'Payment could not be confirmed.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={plan ? `Pay for ${plan.name}` : 'Pay'} size="md">
      {loading && <p className="py-6 text-center text-sm text-text-secondary">Preparing checkout…</p>}
      {error && <AlertBanner variant="error" message={error} />}
      {!loading && intent && !intent.publishableKey && (
        <AlertBanner
          variant="warning"
          message="Stripe publishable key is not configured (Settings → Payments → Stripe)."
        />
      )}
      {!loading && intent && intent.publishableKey && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret }}>
          <ExpressForm clientSecret={intent.clientSecret} onPaid={finalize} onError={setError} />
        </Elements>
      )}
    </Modal>
  );
}

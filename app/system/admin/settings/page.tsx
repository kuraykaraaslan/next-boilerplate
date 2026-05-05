'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Input } from '@/modules/ui/Input';
import { Button } from '@/modules/ui/Button';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Spinner } from '@/modules/ui/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave, faEnvelope, faGlobe, faCopy, faCheck,
  faCreditCard, faLink, faKey,
} from '@fortawesome/free-solid-svg-icons';

interface Settings {
  appName: string;
  appUrl: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  stripeWebhookSecret: string;
  paypalWebhookId: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className="text-text-disabled hover:text-text-primary transition-colors focus-visible:outline-none"
    >
      <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-3.5 h-3.5" />
    </button>
  );
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    appName: '',
    appUrl: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    stripeWebhookSecret: '',
    paypalWebhookId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/system/api/settings')
      .then((res) => {
        const s = res.data.settings ?? {};
        setSettings((prev) => ({ ...prev, ...s }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async (section: Partial<Settings>) => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await api.put('/system/api/settings', { settings: { ...settings, ...section } });
      setSettings((prev) => ({ ...prev, ...section }));
      setSuccessMsg('Settings saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">System Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">Configure global system behaviour</p>
      </div>

      {successMsg && <AlertBanner variant="success" message={successMsg} dismissible />}
      {errorMsg && <AlertBanner variant="error" message={errorMsg} dismissible />}

      <Card title="General" subtitle="Basic application configuration">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave({ appName: settings.appName, appUrl: settings.appUrl }); }}
          className="space-y-4"
        >
          <Input
            id="app-name"
            label="Application Name"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={settings.appName}
            onChange={(e) => setSettings((v) => ({ ...v, appName: e.target.value }))}
          />
          <Input
            id="app-url"
            label="Application URL"
            type="url"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={settings.appUrl}
            onChange={(e) => setSettings((v) => ({ ...v, appUrl: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save General
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Email / SMTP" subtitle="Outbound email configuration">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave({ smtpHost: settings.smtpHost, smtpPort: settings.smtpPort, smtpUser: settings.smtpUser });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="smtp-host"
              label="SMTP Host"
              prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
              value={settings.smtpHost}
              onChange={(e) => setSettings((v) => ({ ...v, smtpHost: e.target.value }))}
            />
            <Input
              id="smtp-port"
              label="SMTP Port"
              type="number"
              value={settings.smtpPort}
              onChange={(e) => setSettings((v) => ({ ...v, smtpPort: e.target.value }))}
            />
          </div>
          <Input
            id="smtp-user"
            label="SMTP Username"
            type="email"
            prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
            value={settings.smtpUser}
            onChange={(e) => setSettings((v) => ({ ...v, smtpUser: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save Email Config
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Payment Webhooks ── */}
      <div>
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <FontAwesomeIcon icon={faCreditCard} className="w-4 h-4 text-text-secondary" />
          Payment Webhooks
        </h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Configure provider webhook endpoints so payment events are reflected automatically.
        </p>
      </div>

      {/* Stripe */}
      <Card
        title="Stripe"
        subtitle="Receive checkout and subscription lifecycle events from Stripe"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave({ stripeWebhookSecret: settings.stripeWebhookSecret }); }}
          className="space-y-4"
        >
          <Input
            id="stripe-webhook-endpoint"
            label="Webhook Endpoint URL"
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/system/api/webhooks/stripe`}
            prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
            suffixIcon={
              <CopyButton
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/system/api/webhooks/stripe`}
              />
            }
            hint="Add this URL in Stripe Dashboard → Developers → Webhooks"
          />
          <Input
            id="stripe-webhook-secret"
            label="Signing Secret"
            type="password"
            prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
            value={settings.stripeWebhookSecret}
            onChange={(e) => setSettings((v) => ({ ...v, stripeWebhookSecret: e.target.value }))}
            hint='Found in Stripe Dashboard → Webhooks → your endpoint → "Signing secret"'
            placeholder="whsec_..."
          />
          <p className="text-xs text-text-secondary">
            Subscribe to events:{' '}
            <code className="bg-surface-overlay rounded px-1 py-0.5 font-mono text-xs">
              checkout.session.completed, checkout.session.expired, payment_intent.payment_failed,
              charge.refunded, invoice.payment_succeeded, invoice.payment_failed,
              customer.subscription.deleted
            </code>
          </p>
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save Stripe Webhook
            </Button>
          </div>
        </form>
      </Card>

      {/* PayPal */}
      <Card
        title="PayPal"
        subtitle="Receive payment capture and subscription events from PayPal"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave({ paypalWebhookId: settings.paypalWebhookId }); }}
          className="space-y-4"
        >
          <Input
            id="paypal-webhook-endpoint"
            label="Webhook Endpoint URL"
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/system/api/webhooks/paypal`}
            prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
            suffixIcon={
              <CopyButton
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/system/api/webhooks/paypal`}
              />
            }
            hint="Add this URL in PayPal Developer Dashboard → Webhooks"
          />
          <Input
            id="paypal-webhook-id"
            label="Webhook ID"
            prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
            value={settings.paypalWebhookId}
            onChange={(e) => setSettings((v) => ({ ...v, paypalWebhookId: e.target.value }))}
            hint='Found in PayPal Developer → My Apps → your app → Webhooks → Webhook ID'
            placeholder="WH-XXXX..."
          />
          <p className="text-xs text-text-secondary">
            Subscribe to events:{' '}
            <code className="bg-surface-overlay rounded px-1 py-0.5 font-mono text-xs">
              PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED,
              CHECKOUT.ORDER.COMPLETED, BILLING.SUBSCRIPTION.CANCELLED,
              BILLING.SUBSCRIPTION.PAYMENT.FAILED
            </code>
          </p>
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save PayPal Webhook
            </Button>
          </div>
        </form>
      </Card>

      {/* Iyzico */}
      <Card
        title="Iyzico"
        subtitle="Receive payment callbacks from Iyzico checkout forms"
      >
        <div className="space-y-4">
          <Input
            id="iyzico-callback-endpoint"
            label="Callback URL"
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/system/api/webhooks/iyzico`}
            prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
            suffixIcon={
              <CopyButton
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/system/api/webhooks/iyzico`}
              />
            }
            hint="Set as the callbackUrl in Iyzico Merchant Settings and in checkout form requests"
          />
          <p className="text-xs text-text-secondary">
            Iyzico uses a token-based callback model. No signing secret is required — the token is
            verified against the Iyzico API using the API key and secret key configured in the
            Payment settings section.
          </p>
        </div>
      </Card>
    </div>
  );
}

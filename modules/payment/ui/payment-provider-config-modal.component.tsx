'use client';
import { useState, useEffect } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStripe, faPaypal, faAlipay, faWeixin } from '@fortawesome/free-brands-svg-icons';
import { faCreditCard, faStar } from '@fortawesome/free-solid-svg-icons';
import { Modal } from '@nb/common/ui/modal.component';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Toggle } from '@nb/common/ui/toggle.component';
import type { SR } from '@nb/setting/ui/settings-kit.component';

type FieldType = 'text' | 'password' | 'toggle';
export interface ProviderField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
}

export interface ProviderDef {
  /** Lowercase gateway key, matches the payment:gateway / payment:coupon contribution key. */
  key: string;
  name: string;
  /** Per-tenant enable flag setting key (e.g. 'stripeEnabled'). */
  enabledKey: string;
  icon: IconDefinition;
  /** Tailwind text colour for the brand glyph. */
  tint: string;
  region: string;
  description: string;
  docsUrl?: string;
  /** Credential / option fields (the enable toggle is rendered separately). */
  fields: ProviderField[];
}

/**
 * Catalogue of supported payment gateways and the settings keys each one reads
 * server-side (see modules/payment_<key>). Editing here is the single place to
 * surface a new gateway's credentials in the admin UI.
 */
export const PAYMENT_PROVIDERS: ProviderDef[] = [
  {
    key: 'stripe', name: 'Stripe', enabledKey: 'stripeEnabled', icon: faStripe, tint: 'text-[#635bff]',
    region: 'Global', description: 'Cards, wallets & subscriptions worldwide.',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'stripePublishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_…' },
      { key: 'stripeSecretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_…' },
      { key: 'stripeWebhookSecret', label: 'Webhook Signing Secret', type: 'password', placeholder: 'whsec_…' },
      { key: 'stripeConnectSecretKey', label: 'Connect Secret Key', type: 'password', help: 'Optional — only for Stripe Connect white-label tenants.' },
    ],
  },
  {
    key: 'paypal', name: 'PayPal', enabledKey: 'paypalEnabled', icon: faPaypal, tint: 'text-[#0070ba]',
    region: 'Global', description: 'PayPal balance & cards via Orders v2.',
    docsUrl: 'https://developer.paypal.com/dashboard/applications/live',
    fields: [
      { key: 'paypalClientId', label: 'Client ID', type: 'text' },
      { key: 'paypalClientSecret', label: 'Client Secret', type: 'password' },
      { key: 'paypalSandboxMode', label: 'Sandbox Mode', type: 'toggle' },
    ],
  },
  {
    key: 'iyzico', name: 'iyzico', enabledKey: 'iyzicoEnabled', icon: faCreditCard, tint: 'text-[#1e64ff]',
    region: 'Turkey', description: 'TR cards, BKM Express & installments.',
    docsUrl: 'https://merchant.iyzipay.com/settings',
    fields: [
      { key: 'iyzicoApiKey', label: 'API Key', type: 'text' },
      { key: 'iyzicoSecretKey', label: 'Secret Key', type: 'password' },
      { key: 'iyzicoSandboxMode', label: 'Sandbox Mode', type: 'toggle' },
      { key: 'iyzicoEnabledInstallments', label: 'Enabled Installments', type: 'text', placeholder: '2,3,6,9', help: 'Comma-separated installment counts.' },
    ],
  },
  {
    key: 'alipay', name: 'Alipay', enabledKey: 'alipayEnabled', icon: faAlipay, tint: 'text-[#1677ff]',
    region: 'China', description: 'Alipay wallet redirect checkout.',
    fields: [
      { key: 'alipayAppId', label: 'App ID', type: 'text' },
      { key: 'alipayPrivateKey', label: 'App Private Key', type: 'password' },
      { key: 'alipayPublicKey', label: 'Alipay Public Key', type: 'text' },
      { key: 'alipaySandboxMode', label: 'Sandbox Mode', type: 'toggle' },
    ],
  },
  {
    key: 'wechatpay', name: 'WeChat Pay', enabledKey: 'wechatPayEnabled', icon: faWeixin, tint: 'text-[#07c160]',
    region: 'China', description: 'WeChat Pay native / JSAPI checkout.',
    fields: [
      { key: 'wechatPayAppId', label: 'App ID', type: 'text' },
      { key: 'wechatPayMchId', label: 'Merchant ID', type: 'text' },
      { key: 'wechatPaySerialNo', label: 'Certificate Serial No.', type: 'text' },
      { key: 'wechatPayPrivateKey', label: 'API Private Key', type: 'password' },
      { key: 'wechatPayNotifyUrl', label: 'Notify URL', type: 'text', placeholder: 'https://…/webhook' },
    ],
  },
  {
    key: 'yookassa', name: 'YooKassa', enabledKey: 'yookassaEnabled', icon: faCreditCard, tint: 'text-[#8b3ffd]',
    region: 'Russia', description: 'YooKassa cards & local methods.',
    docsUrl: 'https://yookassa.ru/my/merchant',
    fields: [
      { key: 'yookassaShopId', label: 'Shop ID', type: 'text' },
      { key: 'yookassaSecretKey', label: 'Secret Key', type: 'password' },
    ],
  },
  {
    key: 'cloudpayments', name: 'CloudPayments', enabledKey: 'cloudpaymentsEnabled', icon: faCreditCard, tint: 'text-[#1a73e8]',
    region: 'Russia', description: 'CloudPayments card widget.',
    docsUrl: 'https://merchant.cloudpayments.ru/',
    fields: [
      { key: 'cloudpaymentsPublicId', label: 'Public ID', type: 'text' },
      { key: 'cloudpaymentsApiSecret', label: 'API Secret', type: 'password' },
    ],
  },
];

const toBool = (v: unknown) => v === true || v === 'true';
const boolStr = (v: boolean) => (v ? 'true' : 'false');

/** A provider is "configured" once all its non-toggle credential fields are filled. */
export function isProviderConfigured(p: ProviderDef, settings: SR): boolean {
  return p.fields
    .filter((f) => f.type !== 'toggle' && !f.help?.startsWith('Optional'))
    .every((f) => String(settings[f.key] ?? '').trim().length > 0);
}

export function PaymentProviderConfigModal({
  provider,
  open,
  settings,
  saving,
  isDefault,
  onSave,
  onClose,
}: {
  provider: ProviderDef;
  open: boolean;
  settings: SR;
  saving: boolean;
  isDefault: boolean;
  onSave: (patch: SR) => Promise<void>;
  onClose: () => void;
}) {
  const seed = () => {
    const init: Record<string, string | boolean> = { [provider.enabledKey]: toBool(settings[provider.enabledKey]) };
    for (const f of provider.fields) {
      init[f.key] = f.type === 'toggle' ? toBool(settings[f.key]) : String(settings[f.key] ?? '');
    }
    return init;
  };

  const [form, setForm] = useState<Record<string, string | boolean>>(seed);
  const [makeDefault, setMakeDefault] = useState(false);

  // Re-seed whenever the modal (re)opens for a provider so stale edits don't leak.
  useEffect(() => {
    if (open) { setForm(seed()); setMakeDefault(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider.key]);

  const enabled = toBool(form[provider.enabledKey]);
  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    const patch: SR = { [provider.enabledKey]: boolStr(enabled) };
    for (const f of provider.fields) {
      patch[f.key] = f.type === 'toggle' ? boolStr(toBool(form[f.key])) : String(form[f.key] ?? '');
    }
    if (makeDefault && enabled) patch.paymentDefaultProvider = provider.key;
    await onSave(patch);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${provider.name} configuration`}
      description={`${provider.region} · credentials are stored encrypted per tenant`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-sunken px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Enable {provider.name}</p>
            <p className="text-xs text-text-secondary">Allow customers to pay through this gateway.</p>
          </div>
          <Toggle id={`${provider.key}-enabled`} label="" checked={enabled} onChange={(v) => set(provider.enabledKey, v)} />
        </div>

        <div className="space-y-4">
          {provider.fields.map((f) =>
            f.type === 'toggle' ? (
              <Toggle key={f.key} id={f.key} label={f.label} size="sm"
                checked={toBool(form[f.key])} onChange={(v) => set(f.key, v)} />
            ) : (
              <div key={f.key}>
                <Input id={f.key} label={f.label} type={f.type === 'password' ? 'password' : 'text'}
                  value={String(form[f.key] ?? '')} placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)} />
                {f.help && <p className="mt-1 text-xs text-text-secondary">{f.help}</p>}
              </div>
            ),
          )}
        </div>

        {!isDefault && (
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="accent-primary" checked={makeDefault} disabled={!enabled}
              onChange={(e) => setMakeDefault(e.target.checked)} />
            <span className="inline-flex items-center gap-1">
              Set as default payment method
              <span className="text-text-disabled">(requires enabled)</span>
            </span>
          </label>
        )}
        {isDefault && (
          <p className="flex items-center gap-1.5 text-xs text-warning-fg">
            <FontAwesomeIcon icon={faStar} className="w-3 h-3" aria-hidden />
            This is the current default payment method.
          </p>
        )}

        {provider.docsUrl && (
          <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
            className="inline-block text-xs text-primary hover:underline">
            Where do I find these credentials? ↗
          </a>
        )}
      </div>
    </Modal>
  );
}

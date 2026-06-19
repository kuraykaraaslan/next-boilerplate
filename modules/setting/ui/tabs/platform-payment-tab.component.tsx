'use client';

import { useState } from 'react';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { b, bStr, SaveRow, type SR, type TabProps } from './platform-tab.shared.component';
import { CommunityProvidersCard } from '@kuraykaraaslan/common/ui/community-providers-card.component';

export function PlatformPaymentTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    currency: settings.currency ?? 'USD',
    taxEnabled: b(settings.taxEnabled),
    taxRate: settings.taxRate ?? '0',
    stripeEnabled: b(settings.stripeEnabled),
    stripePublicKey: settings.stripePublicKey ?? '',
    stripeSecretKey: settings.stripeSecretKey ?? '',
    stripeWebhookSecret: settings.stripeWebhookSecret ?? '',
    iyzicoEnabled: b(settings.iyzicoEnabled),
    iyzicoApiKey: settings.iyzicoApiKey ?? '',
    iyzicoSecretKey: settings.iyzicoSecretKey ?? '',
    iyzicoSandboxMode: b(settings.iyzicoSandboxMode),
    subscriptionEnabled: b(settings.subscriptionEnabled),
    defaultTrialDays: settings.defaultTrialDays ?? '14',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch(): SR {
    return {
      ...f,
      taxEnabled: bStr(f.taxEnabled),
      stripeEnabled: bStr(f.stripeEnabled),
      iyzicoEnabled: bStr(f.iyzicoEnabled),
      iyzicoSandboxMode: bStr(f.iyzicoSandboxMode),
      subscriptionEnabled: bStr(f.subscriptionEnabled),
    };
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Currency & Tax">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ currency: f.currency, taxEnabled: bStr(f.taxEnabled), taxRate: f.taxRate }); }} className="space-y-4">
          <Input id="currency" label="Default Currency" value={f.currency} placeholder="USD"
            onChange={(e) => patch('currency', e.target.value)} />
          <Toggle id="taxEnabled" label="Enable Tax"
            checked={f.taxEnabled} onChange={(v) => patch('taxEnabled', v)} />
          {f.taxEnabled && (
            <Input id="taxRate" label="Tax Rate (%)" type="number" value={f.taxRate}
              onChange={(e) => patch('taxRate', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Subscription">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ subscriptionEnabled: bStr(f.subscriptionEnabled), defaultTrialDays: f.defaultTrialDays }); }} className="space-y-4">
          <Toggle id="subscriptionEnabled" label="Enable Subscriptions"
            checked={f.subscriptionEnabled} onChange={(v) => patch('subscriptionEnabled', v)} />
          <Input id="defaultTrialDays" label="Default Trial Days" type="number" value={f.defaultTrialDays}
            onChange={(e) => patch('defaultTrialDays', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Stripe">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="stripeEnabled" label="Enable Stripe"
            checked={f.stripeEnabled} onChange={(v) => patch('stripeEnabled', v)} />
          {f.stripeEnabled && (
            <>
              <Input id="stripePublicKey" label="Publishable Key" value={f.stripePublicKey}
                onChange={(e) => patch('stripePublicKey', e.target.value)} />
              <Input id="stripeSecretKey" label="Secret Key" type="password" value={f.stripeSecretKey}
                onChange={(e) => patch('stripeSecretKey', e.target.value)} />
              <Input id="stripeWebhookSecret" label="Webhook Signing Secret" type="password"
                value={f.stripeWebhookSecret}
                onChange={(e) => patch('stripeWebhookSecret', e.target.value)} />
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Iyzico (Turkey)">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="iyzicoEnabled" label="Enable Iyzico"
            checked={f.iyzicoEnabled} onChange={(v) => patch('iyzicoEnabled', v)} />
          {f.iyzicoEnabled && (
            <>
              <Toggle id="iyzicoSandbox" label="Sandbox Mode" size="sm"
                checked={f.iyzicoSandboxMode} onChange={(v) => patch('iyzicoSandboxMode', v)} />
              <Input id="iyzicoApiKey" label="API Key" value={f.iyzicoApiKey}
                onChange={(e) => patch('iyzicoApiKey', e.target.value)} />
              <Input id="iyzicoSecretKey" label="Secret Key" type="password" value={f.iyzicoSecretKey}
                onChange={(e) => patch('iyzicoSecretKey', e.target.value)} />
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <CommunityProvidersCard
        point="payment:gateway"
        title="Payment Gateways"
        subtitle="Payment gateways (Stripe, PayPal, Iyzico, …) are community plugins — install & configure them in the Marketplace"
      />
    </div>
  );
}

'use client';
import { use, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faStar } from '@fortawesome/free-solid-svg-icons';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { SettingsPanelHost } from '@kuraykaraaslan/setting/ui/settings-panel-host.component';
import type { SR } from '@kuraykaraaslan/setting/ui/settings-kit.component';
import { PaymentMethodsPanel } from '@kuraykaraaslan/payment/ui/payment-methods-panel.component';
import {
  PAYMENT_PROVIDERS,
  isProviderConfigured,
  PaymentProviderConfigModal,
  type ProviderDef,
} from './payment-provider-config-modal.component';

const toBool = (v: unknown) => v === true || v === 'true';
const boolStr = (v: boolean) => (v ? 'true' : 'false');

function GeneralCard({ settings, onSave, saving }: { settings: SR; onSave: (p: SR) => Promise<void>; saving: boolean }) {
  const [f, setF] = useState({
    currency: settings.currency ?? 'USD',
    taxEnabled: toBool(settings.taxEnabled),
    taxRate: settings.taxRate ?? '0',
    subscriptionEnabled: toBool(settings.subscriptionEnabled),
    defaultTrialDays: settings.defaultTrialDays ?? '14',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Card title="General" subtitle="Currency, tax and subscription defaults">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            currency: f.currency,
            taxEnabled: boolStr(f.taxEnabled),
            taxRate: f.taxRate,
            subscriptionEnabled: boolStr(f.subscriptionEnabled),
            defaultTrialDays: f.defaultTrialDays,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="currency" label="Default Currency" value={f.currency} placeholder="USD"
            onChange={(e) => set('currency', e.target.value)} />
          <Input id="defaultTrialDays" label="Default Trial Days" type="number" value={f.defaultTrialDays}
            onChange={(e) => set('defaultTrialDays', e.target.value)} />
        </div>
        <Toggle id="taxEnabled" label="Enable Tax" checked={f.taxEnabled} onChange={(v) => set('taxEnabled', v)} />
        {f.taxEnabled && (
          <Input id="taxRate" label="Tax Rate (%)" type="number" value={f.taxRate}
            onChange={(e) => set('taxRate', e.target.value)} />
        )}
        <Toggle id="subscriptionEnabled" label="Enable Subscriptions"
          checked={f.subscriptionEnabled} onChange={(v) => set('subscriptionEnabled', v)} />
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </Card>
  );
}

function ProviderRow({
  p, settings, isDefault, onClick,
}: { p: ProviderDef; settings: SR; isDefault: boolean; onClick: () => void }) {
  const enabled = toBool(settings[p.enabledKey]);
  const configured = isProviderConfigured(p, settings);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-border bg-surface-raised p-4 text-left
                 transition-colors hover:border-border-focus hover:bg-surface-overlay focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-2xl ${p.tint}`}>
        <FontAwesomeIcon icon={p.icon} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-text-primary">{p.name}</span>
          {isDefault && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning-fg">
              <FontAwesomeIcon icon={faStar} className="h-2.5 w-2.5" aria-hidden /> Default
            </span>
          )}
        </div>
        <p className="truncate text-xs text-text-secondary">{p.region} · {p.description}</p>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        {enabled
          ? <Badge variant="success" size="sm" dot>Active</Badge>
          : <Badge variant="neutral" size="sm" dot>Inactive</Badge>}
        <Badge variant={configured ? 'info' : 'warning'} size="sm">
          {configured ? 'Connected' : 'Setup needed'}
        </Badge>
      </div>

      <FontAwesomeIcon icon={faChevronRight}
        className="h-3.5 w-3.5 text-text-disabled transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

function ProvidersPanel({ settings, onSave, saving }: { settings: SR; onSave: (p: SR) => Promise<void>; saving: boolean }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = PAYMENT_PROVIDERS.find((p) => p.key === activeKey) ?? null;
  const defaultProvider = String(settings.paymentDefaultProvider ?? '').toLowerCase();
  const activeCount = PAYMENT_PROVIDERS.filter((p) => toBool(settings[p.enabledKey])).length;

  return (
    <Card
      title="Payment Providers"
      subtitle={`${activeCount} of ${PAYMENT_PROVIDERS.length} gateways active`}
    >
      <div className="grid gap-3">
        {PAYMENT_PROVIDERS.map((p) => (
          <ProviderRow key={p.key} p={p} settings={settings}
            isDefault={defaultProvider === p.key} onClick={() => setActiveKey(p.key)} />
        ))}
      </div>

      {active && (
        <PaymentProviderConfigModal
          provider={active}
          open={!!active}
          settings={settings}
          saving={saving}
          isDefault={defaultProvider === active.key}
          onSave={onSave}
          onClose={() => setActiveKey(null)}
        />
      )}
    </Card>
  );
}

export default function PaymentsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Payments"
      subtitle="Currency, tax and payment provider credentials"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {({ settings, onSave, saving }) => (
        <div className="pt-6">
          <TabGroup tabs={[
            {
              id: 'general', label: 'General & Providers',
              content: (
                <div className="space-y-6">
                  <GeneralCard settings={settings} onSave={onSave} saving={saving} />
                  <ProvidersPanel settings={settings} onSave={onSave} saving={saving} />
                </div>
              ),
            },
            { id: 'methods', label: 'Payment Methods', content: <PaymentMethodsPanel tenantId={tenantId} /> },
          ]} />
        </div>
      )}
    </SettingsPanelHost>
  );
}

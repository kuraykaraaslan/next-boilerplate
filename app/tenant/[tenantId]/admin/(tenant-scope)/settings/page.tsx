'use client';

import { use, useEffect, useState, useCallback } from 'react';
import api from '@/modules_next/common/axios';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { Select } from '@/modules_next/common/ui/Select';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { AvatarUpload } from '@/modules_next/common/ui/AvatarUpload';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding, faPalette, faFileInvoice, faTriangleExclamation,
  faEnvelope, faPhone, faLocationDot, faSave, faTrash, faIdCard,
  faGear,
} from '@fortawesome/free-solid-svg-icons';
import { TenantESignatureSettingsPanel } from '@/modules_next/e_signature/ui/TenantESignatureSettingsPanel';
import { PlatformSettingsTabs } from '@/modules_next/setting/ui/PlatformSettingsTabs';

type SR = Record<string, string>;

type TabProps = {
  tenantId: string;
  settings: SR;
  onSave: (patch: SR) => Promise<void>;
  saving: boolean;
};

type BrandingData = {
  brandName?: string;
  brandTagline?: string;
  brandLogoLight?: string | null;
  brandLogoDark?: string | null;
  brandFavicon?: string | null;
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  authWallpaper?: string | null;
  customCss?: string;
  customJs?: string;
};

function b(v: string | undefined) { return v === 'true'; }
function bStr(v: boolean) { return v ? 'true' : 'false'; }

function SaveRow({ loading }: { loading: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button type="submit" loading={loading} iconLeft={<FontAwesomeIcon icon={faSave} />}>
        Save
      </Button>
    </div>
  );
}

// ─── Timezone / Language options (subset) ────────────────────────────────────

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Istanbul', label: 'Europe/Istanbul (UTC+3)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0/+1)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (UTC+1/+2)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5/-4)' },
  { value: 'America/Chicago', label: 'America/Chicago (UTC-6/-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8/-7)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+10/+11)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ar', label: 'العربية' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'DD_MM_YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM_DD_YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY_MM_DD', label: 'YYYY-MM-DD' },
];

const TIME_FORMAT_OPTIONS = [
  { value: 'H24', label: '24-hour (14:30)' },
  { value: 'H12', label: '12-hour (2:30 PM)' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'TRY', label: 'TRY — Turkish Lira' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
];

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ tenantId, settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    tenantName: settings.tenantName ?? '',
    tenantDescription: settings.tenantDescription ?? '',
    contactEmail: settings.contactEmail ?? '',
    contactPhone: settings.contactPhone ?? '',
    contactAddress: settings.contactAddress ?? '',
    timezone: settings.timezone ?? 'UTC',
    language: settings.language ?? 'en',
    dateFormat: settings.dateFormat ?? 'DD_MM_YYYY',
    timeFormat: settings.timeFormat ?? 'H24',
  });

  function patch(key: keyof typeof f, val: string) { setF((p) => ({ ...p, [key]: val })); }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Organization" subtitle="Basic identity of your workspace">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ tenantName: f.tenantName, tenantDescription: f.tenantDescription }); }}
          className="space-y-4"
        >
          <Input id="tenantName" label="Organization Name" value={f.tenantName}
            prefixIcon={<FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5" />}
            onChange={(e) => patch('tenantName', e.target.value)} />
          <Input id="tenantDescription" label="Description" value={f.tenantDescription}
            placeholder="What does your organization do?"
            onChange={(e) => patch('tenantDescription', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Contact Information">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ contactEmail: f.contactEmail, contactPhone: f.contactPhone, contactAddress: f.contactAddress }); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="contactEmail" label="Contact Email" type="email" value={f.contactEmail}
              prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
              onChange={(e) => patch('contactEmail', e.target.value)} />
            <Input id="contactPhone" label="Contact Phone" type="tel" value={f.contactPhone}
              prefixIcon={<FontAwesomeIcon icon={faPhone} className="w-3.5 h-3.5" />}
              onChange={(e) => patch('contactPhone', e.target.value)} />
          </div>
          <Input id="contactAddress" label="Address" value={f.contactAddress}
            prefixIcon={<FontAwesomeIcon icon={faLocationDot} className="w-3.5 h-3.5" />}
            onChange={(e) => patch('contactAddress', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Regional Settings" subtitle="Locale, timezone, and date/time display">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ timezone: f.timezone, language: f.language, dateFormat: f.dateFormat, timeFormat: f.timeFormat }); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select id="language" label="Language" options={LANGUAGE_OPTIONS}
              value={f.language} onChange={(e) => patch('language', e.target.value)} />
            <Select id="timezone" label="Timezone" options={TIMEZONE_OPTIONS}
              value={f.timezone} onChange={(e) => patch('timezone', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select id="dateFormat" label="Date Format" options={DATE_FORMAT_OPTIONS}
              value={f.dateFormat} onChange={(e) => patch('dateFormat', e.target.value)} />
            <Select id="timeFormat" label="Time Format" options={TIME_FORMAT_OPTIONS}
              value={f.timeFormat} onChange={(e) => patch('timeFormat', e.target.value)} />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────

function BrandingTab({ tenantId, saving }: Pick<TabProps, 'tenantId' | 'saving'> & { globalSaving: boolean }) {
  const [branding, setBranding] = useState<BrandingData>({});
  const [loading, setLoading] = useState(true);
  const [saving2, setSaving2] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/settings/branding`)
      .then((res) => setBranding(res.data.branding ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  function set<K extends keyof BrandingData>(key: K, val: BrandingData[K]) {
    setBranding((b) => ({ ...b, [key]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving2(true);
    setError('');
    try {
      await api.put(`/tenant/${tenantId}/api/settings/branding`, { branding });
      setSuccess('Branding saved.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save branding.');
    } finally {
      setSaving2(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  return (
    <div className="pt-6 space-y-6">
      {error   && <AlertBanner variant="error"   message={error}   dismissible />}
      {success && <AlertBanner variant="success" message={success} dismissible />}

      <form onSubmit={handleSave} className="space-y-6">
        <Card title="Brand Identity" subtitle="Name, tagline, and logo assets">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="brandName" label="Brand Name" value={branding.brandName ?? ''}
                onChange={(e) => set('brandName', e.target.value)} />
              <Input id="brandTagline" label="Tagline" value={branding.brandTagline ?? ''}
                placeholder="Empowering teams worldwide"
                onChange={(e) => set('brandTagline', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Logo (Light)</label>
                <AvatarUpload
                  src={branding.brandLogoLight ?? null}
                  name="logo-light"
                  uploadEndpoint={`/tenant/${tenantId}/api/storage`}
                  onUpload={(url) => set('brandLogoLight', url)}
                  onRemove={() => set('brandLogoLight', null)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Logo (Dark)</label>
                <AvatarUpload
                  src={branding.brandLogoDark ?? null}
                  name="logo-dark"
                  uploadEndpoint={`/tenant/${tenantId}/api/storage`}
                  onUpload={(url) => set('brandLogoDark', url)}
                  onRemove={() => set('brandLogoDark', null)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Favicon</label>
                <AvatarUpload
                  src={branding.brandFavicon ?? null}
                  name="favicon"
                  uploadEndpoint={`/tenant/${tenantId}/api/storage`}
                  onUpload={(url) => set('brandFavicon', url)}
                  onRemove={() => set('brandFavicon', null)}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Colors" subtitle="Primary and secondary brand colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="primaryColor" className="text-xs font-medium text-text-secondary">Primary Color</label>
              <div className="flex items-center gap-2">
                <input id="primaryColor" type="color"
                  value={branding.brandPrimaryColor ?? '#6366f1'}
                  onChange={(e) => set('brandPrimaryColor', e.target.value)}
                  className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-surface-base"
                />
                <Input id="primaryColorHex" label=""
                  value={branding.brandPrimaryColor ?? ''}
                  placeholder="#6366f1"
                  onChange={(e) => set('brandPrimaryColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="secondaryColor" className="text-xs font-medium text-text-secondary">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input id="secondaryColor" type="color"
                  value={branding.brandSecondaryColor ?? '#8b5cf6'}
                  onChange={(e) => set('brandSecondaryColor', e.target.value)}
                  className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-surface-base"
                />
                <Input id="secondaryColorHex" label=""
                  value={branding.brandSecondaryColor ?? ''}
                  placeholder="#8b5cf6"
                  onChange={(e) => set('brandSecondaryColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Auth Wallpaper" subtitle="Background image shown on login / register screens">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Wallpaper Image</label>
            <AvatarUpload
              src={branding.authWallpaper ?? null}
              name="auth-wallpaper"
              uploadEndpoint={`/tenant/${tenantId}/api/storage`}
              onUpload={(url) => set('authWallpaper', url)}
              onRemove={() => set('authWallpaper', null)}
            />
          </div>
        </Card>

        <Card title="Custom Code" subtitle="Inject CSS or JS — applied globally within this workspace">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customCss" className="text-xs font-medium text-text-secondary">Custom CSS</label>
              <textarea
                id="customCss"
                rows={6}
                value={branding.customCss ?? ''}
                onChange={(e) => set('customCss', e.target.value)}
                placeholder=":root { --primary: #6366f1; }"
                className="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-border-focus resize-y"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customJs" className="text-xs font-medium text-text-secondary">Custom JS</label>
              <textarea
                id="customJs"
                rows={6}
                value={branding.customJs ?? ''}
                onChange={(e) => set('customJs', e.target.value)}
                placeholder="// Runs after page load"
                className="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-border-focus resize-y"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving2} iconLeft={<FontAwesomeIcon icon={faSave} />}>
            Save Branding
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

function BillingTab({ tenantId, settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    billingEmail: settings.billingEmail ?? '',
    billingName: settings.billingName ?? '',
    billingAddress: settings.billingAddress ?? '',
    taxId: settings.taxId ?? '',
    vatNumber: settings.vatNumber ?? '',
    currency: settings.currency ?? 'USD',
    invoicePrefix: settings.invoicePrefix ?? '',
    invoiceFooter: settings.invoiceFooter ?? '',
  });

  function patch(key: keyof typeof f, val: string) { setF((p) => ({ ...p, [key]: val })); }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Billing Details" subtitle="Shown on invoices and payment receipts">
        <form onSubmit={(e) => { e.preventDefault(); onSave(f); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="billingName" label="Billing Name" value={f.billingName}
              placeholder="Acme Inc."
              onChange={(e) => patch('billingName', e.target.value)} />
            <Input id="billingEmail" label="Billing Email" type="email" value={f.billingEmail}
              prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
              onChange={(e) => patch('billingEmail', e.target.value)} />
          </div>
          <Input id="billingAddress" label="Billing Address" value={f.billingAddress}
            placeholder="123 Main St, City, Country"
            onChange={(e) => patch('billingAddress', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Tax & Legal">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ taxId: f.taxId, vatNumber: f.vatNumber }); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="taxId" label="Tax ID" value={f.taxId}
              placeholder="12-3456789"
              onChange={(e) => patch('taxId', e.target.value)} />
            <Input id="vatNumber" label="VAT Number" value={f.vatNumber}
              placeholder="EU123456789"
              onChange={(e) => patch('vatNumber', e.target.value)} />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Invoice Configuration">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ currency: f.currency, invoicePrefix: f.invoicePrefix, invoiceFooter: f.invoiceFooter }); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select id="currency" label="Currency" options={CURRENCY_OPTIONS}
              value={f.currency} onChange={(e) => patch('currency', e.target.value)} />
            <Input id="invoicePrefix" label="Invoice Number Prefix" value={f.invoicePrefix}
              placeholder="INV-"
              hint="e.g. INV- → INV-0042"
              onChange={(e) => patch('invoicePrefix', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invoiceFooter" className="text-xs font-medium text-text-secondary">Invoice Footer</label>
            <textarea
              id="invoiceFooter"
              rows={3}
              value={f.invoiceFooter}
              onChange={(e) => patch('invoiceFooter', e.target.value)}
              placeholder="Thank you for your business. Payment is due within 30 days."
              className="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-border-focus resize-y"
            />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Danger Zone Tab ──────────────────────────────────────────────────────────

function DangerZoneTab({ tenantId }: { tenantId: string }) {
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (confirm !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/settings`);
      window.location.href = `/tenant/${tenantId}/auth/select-tenant`;
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to delete organization.');
      setDeleting(false);
    }
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Danger Zone" subtitle="Irreversible actions — proceed with extreme caution">
        <div className="space-y-6">
          <div className="rounded-lg border border-error/30 bg-error/5 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-error mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Delete Organization</p>
                <p className="text-xs text-text-secondary mt-1">
                  This will permanently delete all organization data including members, settings,
                  subscription history, and files. This action cannot be undone.
                </p>
              </div>
            </div>

            {error && <AlertBanner variant="error" message={error} />}

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="deleteConfirm" className="text-xs font-medium text-text-secondary">
                  Type <span className="font-mono font-bold text-error">DELETE</span> to confirm
                </label>
                <input
                  id="deleteConfirm"
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full max-w-xs rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-error/50"
                />
              </div>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={confirm !== 'DELETE'}
                loading={deleting}
                iconLeft={<FontAwesomeIcon icon={faTrash} />}
              >
                Permanently Delete Organization
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ICON = (icon: React.ReactNode) => <span className="text-sm">{icon}</span>;

export default function TenantSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [settings, setSettings] = useState<SR>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/settings`)
      .then((res) => setSettings(res.data.settings ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleSave = useCallback(async (patch: SR) => {
    setSaving(true);
    setToast(null);
    try {
      await api.put(`/tenant/${tenantId}/api/settings`, { settings: { ...settings, ...patch } });
      setSettings((prev) => ({ ...prev, ...patch }));
      setToast({ type: 'success', msg: 'Settings saved.' });
    } catch (err: any) {
      setToast({ type: 'error', msg: err.response?.data?.message ?? err.message ?? 'Failed to save.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, [tenantId, settings]);

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  const sharedProps: TabProps = { tenantId, settings, onSave: handleSave, saving };

  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: ICON(<FontAwesomeIcon icon={faBuilding} />),
      content: <GeneralTab {...sharedProps} />,
    },
    {
      id: 'branding',
      label: 'Branding',
      icon: ICON(<FontAwesomeIcon icon={faPalette} />),
      content: <BrandingTab tenantId={tenantId} saving={saving} globalSaving={saving} />,
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: ICON(<FontAwesomeIcon icon={faFileInvoice} />),
      content: <BillingTab {...sharedProps} />,
    },
    {
      id: 'e-signature',
      label: 'E-Signature',
      icon: ICON(<FontAwesomeIcon icon={faIdCard} />),
      content: <TenantESignatureSettingsPanel tenantId={tenantId} />,
    },
    // Per-tenant integrations: provider credentials for Email, SMS, Storage,
    // Payment, AI, plus Auth (SSO), Security policy, and Notification routing.
    // Each tenant owns its own row in the shared `settings` table.
    {
      id: 'integrations',
      label: 'Integrations',
      icon: ICON(<FontAwesomeIcon icon={faGear} />),
      content: <PlatformSettingsTabs tenantId={tenantId} />,
    },
    {
      id: 'danger',
      label: 'Danger Zone',
      icon: ICON(<FontAwesomeIcon icon={faTriangleExclamation} className="text-error" />),
      content: <DangerZoneTab tenantId={tenantId} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Organization Settings" subtitle="Manage your workspace configuration" />

      {toast && (
        <AlertBanner
          variant={toast.type === 'success' ? 'success' : 'error'}
          message={toast.msg}
          dismissible
        />
      )}

      <TabGroup tabs={tabs} lazy label="Organization settings sections" />
    </div>
  );
}

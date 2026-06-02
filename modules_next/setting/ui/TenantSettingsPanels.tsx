'use client';
// Tenant-level settings panels extracted from the old monolithic Settings hub so
// each can live on its own per-module page (General → tenant, Billing → payment).
import { useState } from 'react';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faEnvelope, faPhone, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { SaveRow, type SR } from '@/modules_next/setting/ui/settings-kit';

type TabProps = { settings: SR; onSave: (patch: SR) => Promise<void>; saving: boolean };

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

// ─── General (tenant identity / contact / locale) ───────────────────────────────

export function GeneralTab({ settings, onSave, saving }: TabProps) {
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
    <div className="space-y-6">
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

// ─── Billing (tenant billing identity, shown on invoices/receipts) ──────────────

export function BillingTab({ settings, onSave, saving }: TabProps) {
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
    <div className="space-y-6">
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

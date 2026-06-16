'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@nb/common/server/axios';
import { Card } from '@nb/common/ui/card.component';
import { Input } from '@nb/common/ui/input.component';
import { Select } from '@nb/common/ui/select.component';
import { Toggle } from '@nb/common/ui/toggle.component';
import { Button } from '@nb/common/ui/button.component';
import { Spinner } from '@nb/common/ui/spinner.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';

/**
 * Per-tenant invoice PDF template designer. Reads/writes the
 * `invoicePdf*` keys from `/api/admin-settings` and lets the admin
 * preview the result live (server-rendered PDF in an iframe).
 */

type SR = Record<string, string>;

const FONTS = [
  { value: 'helvetica', label: 'Helvetica (sans-serif)' },
  { value: 'times',     label: 'Times (serif)' },
  { value: 'courier',   label: 'Courier (monospace)' },
];

const PAPER = [
  { value: 'a4',     label: 'A4 (210 × 297 mm)' },
  { value: 'letter', label: 'Letter (8.5 × 11 in)' },
];

const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

const WATERMARKS = [
  { value: '',     label: 'None' },
  { value: 'PAID', label: 'PAID' },
  { value: 'VOID', label: 'VOID' },
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'COPY', label: 'COPY' },
];

const KEYS = [
  'invoicePdfPrimaryColor', 'invoicePdfAccentColor', 'invoicePdfTextColor', 'invoicePdfMutedColor',
  'invoicePdfFontFamily', 'invoicePdfPaperSize', 'invoicePdfLanguage',
  'invoicePdfShowLogo', 'invoicePdfShowIban', 'invoicePdfShowTaxOffice',
  'invoicePdfFooterText', 'invoicePdfFooterTermsUrl', 'invoicePdfHeaderTagline',
  'invoicePdfWatermark',
];

export function InvoiceTemplateSettings({ tenantId }: { tenantId: string }) {
  const [settings, setSettings] = useState<SR>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/admin-settings`)
      .then((res) => {
        const all: SR = res.data.settings ?? {};
        const slice: SR = {};
        for (const k of KEYS) if (all[k] != null) slice[k] = String(all[k]);
        setSettings(slice);
      })
      .catch((err) => setToast({ type: 'error', msg: err?.response?.data?.message ?? 'Failed to load' }))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const update = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true); setToast(null);
    try {
      await api.put(`/tenant/${tenantId}/api/admin-settings`, { settings });
      setToast({ type: 'success', msg: 'Template saved.' });
      setPreviewKey((k) => k + 1); // re-render preview
    } catch (err: any) {
      setToast({ type: 'error', msg: err?.response?.data?.message ?? 'Save failed' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, [tenantId, settings]);

  const previewUrl = useMemo(
    () => `/tenant/${tenantId}/api/invoices/preview?v=${previewKey}`,
    [tenantId, previewKey],
  );

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Left: controls ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {toast && <AlertBanner variant={toast.type === 'success' ? 'success' : 'error'} message={toast.msg} dismissible />}

        <Card title="Colors" subtitle="Hex codes — the PDF picks them up immediately on preview.">
          <div className="grid grid-cols-2 gap-3">
            <Input id="invoice-tpl-primary" label="Primary"  value={settings.invoicePdfPrimaryColor ?? '#212529'}
              onChange={(e) => update('invoicePdfPrimaryColor', e.target.value)} placeholder="#212529" />
            <Input id="invoice-tpl-accent" label="Accent"   value={settings.invoicePdfAccentColor ?? '#0d6efd'}
              onChange={(e) => update('invoicePdfAccentColor', e.target.value)} placeholder="#0d6efd" />
            <Input id="invoice-tpl-text" label="Text"     value={settings.invoicePdfTextColor ?? '#212529'}
              onChange={(e) => update('invoicePdfTextColor', e.target.value)} placeholder="#212529" />
            <Input id="invoice-tpl-muted" label="Muted"    value={settings.invoicePdfMutedColor ?? '#6c757d'}
              onChange={(e) => update('invoicePdfMutedColor', e.target.value)} placeholder="#6c757d" />
          </div>
        </Card>

        <Card title="Typography & layout">
          <div className="grid grid-cols-2 gap-3">
            <Select id="invoice-tpl-font-family" label="Font family"
              value={settings.invoicePdfFontFamily ?? 'helvetica'}
              onChange={(e) => update('invoicePdfFontFamily', e.target.value)}
              options={FONTS} />
            <Select id="invoice-tpl-paper-size" label="Paper size"
              value={settings.invoicePdfPaperSize ?? 'a4'}
              onChange={(e) => update('invoicePdfPaperSize', e.target.value)}
              options={PAPER} />
            <Select id="invoice-tpl-language" label="Language"
              value={settings.invoicePdfLanguage ?? 'en'}
              onChange={(e) => update('invoicePdfLanguage', e.target.value)}
              options={LANGS} />
            <Select id="invoice-tpl-watermark" label="Watermark"
              value={settings.invoicePdfWatermark ?? ''}
              onChange={(e) => update('invoicePdfWatermark', e.target.value)}
              options={WATERMARKS} />
          </div>
        </Card>

        <Card title="Visibility toggles">
          <div className="space-y-2">
            <Toggle id="invoice-tpl-show-logo" label="Show logo"
              checked={settings.invoicePdfShowLogo !== 'false'}
              onChange={(c) => update('invoicePdfShowLogo', c ? 'true' : 'false')} />
            <Toggle id="invoice-tpl-show-iban-in-footer" label="Show IBAN in footer"
              checked={settings.invoicePdfShowIban !== 'false'}
              onChange={(c) => update('invoicePdfShowIban', c ? 'true' : 'false')} />
            <Toggle id="invoice-tpl-show-tax-office-tr-only" label="Show tax office (TR-only)"
              checked={settings.invoicePdfShowTaxOffice !== 'false'}
              onChange={(c) => update('invoicePdfShowTaxOffice', c ? 'true' : 'false')} />
          </div>
        </Card>

        <Card title="Header & footer text">
          <div className="space-y-3">
            <Input id="invoice-tpl-header-tagline" label="Header tagline" value={settings.invoicePdfHeaderTagline ?? ''}
              onChange={(e) => update('invoicePdfHeaderTagline', e.target.value)}
              placeholder="Your slogan / mission statement" />
            <Input id="invoice-tpl-footer-text" label="Footer text" value={settings.invoicePdfFooterText ?? ''}
              onChange={(e) => update('invoicePdfFooterText', e.target.value)}
              placeholder="Thank you for your business." />
            <Input id="invoice-tpl-terms-url-footer" label="Terms URL (footer)" value={settings.invoicePdfFooterTermsUrl ?? ''}
              onChange={(e) => update('invoicePdfFooterTermsUrl', e.target.value)}
              placeholder="https://example.com/terms" />
          </div>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setPreviewKey((k) => k + 1)}>Refresh preview</Button>
          <Button onClick={save} loading={saving}>Save template</Button>
        </div>
      </div>

      {/* ── Right: live preview ──────────────────────────────────────── */}
      <Card title="Live preview" subtitle="A sample invoice rendered with the current template — save to refresh server-side.">
        <iframe
          key={previewKey}
          src={previewUrl}
          title="Invoice template preview"
          className="w-full border border-border rounded"
          style={{ height: '700px' }}
        />
      </Card>
    </div>
  );
}

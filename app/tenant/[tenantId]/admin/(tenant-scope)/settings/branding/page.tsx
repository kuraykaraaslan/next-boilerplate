'use client';
import { use, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { Card } from '@nb/common/ui/card.component';
import { Input } from '@nb/common/ui/input.component';
import { Button } from '@nb/common/ui/button.component';
import { Spinner } from '@nb/common/ui/spinner.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { AvatarUpload } from '@nb/common/ui/avatar-upload.component';
import { Breadcrumb } from '@nb/common/ui/breadcrumb.component';
import type { TenantBranding } from '@nb/tenant_branding/server/tenant_branding.types';

// ── CSS theme helpers (same delimiter approach used by page builder) ──────────
const THEME_START = '/* DP_THEME_START */';
const THEME_END   = '/* DP_THEME_END */';

function parseThemeBlock(css: string): Record<string, string> {
  const start = css.indexOf(THEME_START);
  const end   = css.indexOf(THEME_END);
  if (start === -1 || end === -1) return {};
  const block = css.slice(start + THEME_START.length, end);
  const result: Record<string, string> = {};
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) result[m[1].trim()] = m[2].trim();
  return result;
}

function buildThemeBlock(values: Record<string, string>): string {
  const lines = Object.entries(values)
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  if (!lines) return '';
  return `${THEME_START}\n:root {\n${lines}\n}\n${THEME_END}`;
}

function mergeThemeIntoCss(existing: string, values: Record<string, string>): string {
  const start    = existing.indexOf(THEME_START);
  const end      = existing.indexOf(THEME_END);
  const newBlock = buildThemeBlock(values);
  if (start !== -1 && end !== -1) {
    return (existing.slice(0, start) + newBlock + existing.slice(end + THEME_END.length)).trim();
  }
  return (existing.trimEnd() + (existing ? '\n\n' : '') + newBlock).trim();
}

// ── Surface / text / border CSS variable tokens ───────────────────────────────
const ADVANCED_TOKENS = [
  { variable: '--surface-base',    label: 'Page Background',  hint: 'Main page background color' },
  { variable: '--surface-raised',  label: 'Card Background',  hint: 'Cards, panels, sidebars' },
  { variable: '--surface-overlay', label: 'Overlay',          hint: 'Modals, dropdowns, popovers' },
  { variable: '--text-primary',    label: 'Primary Text',     hint: 'Headings and body text' },
  { variable: '--text-secondary',  label: 'Secondary Text',   hint: 'Captions, hints, labels' },
  { variable: '--border',          label: 'Default Border',   hint: 'Inputs and card borders' },
  { variable: '--border-strong',   label: 'Strong Border',    hint: 'Dividers and emphasis lines' },
];

// ── Color field sub-component ─────────────────────────────────────────────────
function ColorField({
  id, label, hint, value, defaultHex, mono, onChange,
}: {
  id: string; label: string; hint?: string; value: string;
  defaultHex: string; mono?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-text-secondary">{label}</label>
      {hint && <p className="text-[11px] text-text-disabled -mt-0.5">{hint}</p>}
      <div className="flex items-center gap-2 mt-0.5">
        <input
          id={id}
          type="color"
          value={value || defaultHex}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-surface-base p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="inherit (default)"
          className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface-base text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-text-disabled"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-text-secondary hover:text-text-primary text-lg leading-none"
            title="Reset to default"
          >
            ×
          </button>
        )}
      </div>
      {mono && <p className="text-[10px] text-text-disabled font-mono mt-0.5">{mono}</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BrandingPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [branding, setBranding] = useState<TenantBranding>({});
  const [theme, setTheme]       = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/settings/branding`)
      .then((res) => {
        const b: TenantBranding = res.data.branding ?? {};
        setBranding(b);
        // Parse CSS variable overrides from existing customCss
        const parsed = parseThemeBlock(b.customCss ?? '');
        // Seed from brandPrimaryColor / brandSecondaryColor if no CSS override yet
        if (b.brandPrimaryColor   && !parsed['--primary'])   parsed['--primary']   = b.brandPrimaryColor;
        if (b.brandSecondaryColor && !parsed['--secondary']) parsed['--secondary'] = b.brandSecondaryColor;
        setTheme(parsed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  function setField<K extends keyof TenantBranding>(key: K, val: TenantBranding[K]) {
    setBranding((b) => ({ ...b, [key]: val }));
  }

  function setToken(variable: string, value: string) {
    setTheme((t) => ({ ...t, [variable]: value }));
    // Keep brand color fields in sync with the CSS variable pickers
    if (variable === '--primary')   setField('brandPrimaryColor', value || undefined);
    if (variable === '--secondary') setField('brandSecondaryColor', value || undefined);
  }

  function setPrimaryColor(value: string) {
    setField('brandPrimaryColor', value || undefined);
    setTheme((t) => ({ ...t, '--primary': value }));
  }

  function setSecondaryColor(value: string) {
    setField('brandSecondaryColor', value || undefined);
    setTheme((t) => ({ ...t, '--secondary': value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const mergedCss = mergeThemeIntoCss(branding.customCss ?? '', theme);
      // Send flat (not wrapped in { branding: ... }) — matches TenantBrandingSchema.safeParse(body)
      await api.put(`/tenant/${tenantId}/api/settings/branding`, {
        ...branding,
        customCss: mergedCss,
      });
      setBranding((b) => ({ ...b, customCss: mergedCss }));
      setSuccess('Branding saved.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Settings', href: `/tenant/${tenantId}/admin/settings` },
        { label: 'Branding' },
      ]} />

      <PageHeader
        title="Branding"
        subtitle="Customize your organization's visual identity and page builder theme"
      />

      {error   && <AlertBanner variant="error"   message={error}   dismissible />}
      {success && <AlertBanner variant="success" message={success} dismissible />}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Visual Identity */}
        <Card title="Visual Identity" subtitle="Logo, favicon, and brand colors">
          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Logo</label>
              <AvatarUpload
                src={branding.brandLogoLight ?? null}
                name="logo"
                uploadEndpoint={`/tenant/${tenantId}/api/storage`}
                onUpload={(url: string) => setField('brandLogoLight', url)}
                onRemove={() => setField('brandLogoLight', undefined)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Favicon</label>
              <AvatarUpload
                src={branding.brandFavicon ?? null}
                name="favicon"
                uploadEndpoint={`/tenant/${tenantId}/api/storage`}
                onUpload={(url: string) => setField('brandFavicon', url)}
                onRemove={() => setField('brandFavicon', undefined)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ColorField
                id="primary-color"
                label="Primary Color"
                hint="Buttons, links, highlights — sets --primary"
                value={branding.brandPrimaryColor ?? ''}
                defaultHex="#6366f1"
                onChange={setPrimaryColor}
              />
              <ColorField
                id="secondary-color"
                label="Secondary Color"
                hint="Secondary actions — sets --secondary"
                value={branding.brandSecondaryColor ?? ''}
                defaultHex="#8b5cf6"
                onChange={setSecondaryColor}
              />
            </div>
          </div>
        </Card>

        {/* Page Builder Theme */}
        <Card
          title="Page Builder Theme"
          subtitle="Override CSS variables used across all page builder blocks. Leave blank to use theme defaults."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ADVANCED_TOKENS.map((token) => (
              <ColorField
                key={token.variable}
                id={token.variable}
                label={token.label}
                hint={token.hint}
                value={theme[token.variable] ?? ''}
                defaultHex="#000000"
                mono={token.variable}
                onChange={(v) => setToken(token.variable, v)}
              />
            ))}
          </div>
        </Card>

        {/* Brand Info */}
        <Card title="Brand Info">
          <div className="space-y-4">
            <Input
              id="brand-name"
              label="Brand Name"
              value={branding.brandName ?? ''}
              onChange={(e) => setField('brandName', e.target.value)}
              placeholder="Acme Corp"
            />
            <Input
              id="brand-tagline"
              label="Tagline"
              value={branding.brandTagline ?? ''}
              onChange={(e) => setField('brandTagline', e.target.value)}
              placeholder="Your company tagline"
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>Save Branding</Button>
        </div>
      </form>
    </div>
  );
}

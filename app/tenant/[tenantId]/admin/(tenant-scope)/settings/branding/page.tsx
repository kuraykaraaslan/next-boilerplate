'use client';
import { use, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { AvatarUpload } from '@/modules_next/common/ui/AvatarUpload';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';

type Branding = {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  companyName?: string | null;
  supportEmail?: string | null;
  supportUrl?: string | null;
  privacyUrl?: string | null;
  termsUrl?: string | null;
};

export default function BrandingPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [branding, setBranding] = useState<Branding>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/settings/branding`)
      .then((res) => setBranding(res.data.branding ?? {}))
      .catch(() => { /* new tenant, no branding yet */ })
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/tenant/${tenantId}/api/settings/branding`, { branding });
      setSuccess('Branding saved.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof Branding>(key: K, val: Branding[K]) {
    setBranding((b) => ({ ...b, [key]: val }));
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Settings', href: `/tenant/${tenantId}/admin/settings` },
        { label: 'Branding' },
      ]} />

      <PageHeader title="Branding" subtitle="Customize your organization's appearance" />

      {error   && <AlertBanner variant="error"   message={error}   dismissible />}
      {success && <AlertBanner variant="success" message={success} dismissible />}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Visual identity */}
        <Card title="Visual Identity" subtitle="Logo, favicon, and colors">
          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Logo</label>
              <AvatarUpload
                src={branding.logoUrl ?? null}
                name="logo"
                uploadEndpoint={`/tenant/${tenantId}/api/storage`}
                onUpload={(url: string) => set('logoUrl', url)}
                onRemove={() => set('logoUrl', null)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Favicon</label>
              <AvatarUpload
                src={branding.faviconUrl ?? null}
                name="favicon"
                uploadEndpoint={`/tenant/${tenantId}/api/storage`}
                onUpload={(url: string) => set('faviconUrl', url)}
                onRemove={() => set('faviconUrl', null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="primary-color" className="text-xs font-medium text-text-secondary">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    id="primary-color"
                    type="color"
                    value={branding.primaryColor ?? '#6366f1'}
                    onChange={(e) => set('primaryColor', e.target.value)}
                    className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-surface-base"
                  />
                  <Input
                    id="primary-color-hex"
                    label=""
                    value={branding.primaryColor ?? ''}
                    placeholder="#6366f1"
                    onChange={(e) => set('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="accent-color" className="text-xs font-medium text-text-secondary">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    id="accent-color"
                    type="color"
                    value={branding.accentColor ?? '#8b5cf6'}
                    onChange={(e) => set('accentColor', e.target.value)}
                    className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-surface-base"
                  />
                  <Input
                    id="accent-color-hex"
                    label=""
                    value={branding.accentColor ?? ''}
                    placeholder="#8b5cf6"
                    onChange={(e) => set('accentColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Company info */}
        <Card title="Company Info">
          <div className="space-y-4">
            <Input id="company-name" label="Company Name"
              value={branding.companyName ?? ''}
              onChange={(e) => set('companyName', e.target.value)}
              placeholder="Acme Corp"
            />
            <Input id="support-email" label="Support Email" type="email"
              value={branding.supportEmail ?? ''}
              onChange={(e) => set('supportEmail', e.target.value)}
              placeholder="support@acme.com"
            />
            <Input id="support-url" label="Support URL" type="url"
              value={branding.supportUrl ?? ''}
              onChange={(e) => set('supportUrl', e.target.value)}
              placeholder="https://support.acme.com"
            />
          </div>
        </Card>

        {/* Legal links */}
        <Card title="Legal Links">
          <div className="space-y-4">
            <Input id="privacy-url" label="Privacy Policy URL" type="url"
              value={branding.privacyUrl ?? ''}
              onChange={(e) => set('privacyUrl', e.target.value)}
              placeholder="https://acme.com/privacy"
            />
            <Input id="terms-url" label="Terms of Service URL" type="url"
              value={branding.termsUrl ?? ''}
              onChange={(e) => set('termsUrl', e.target.value)}
              placeholder="https://acme.com/terms"
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

'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { toast } from '@/modules_next/common/ui/toast.store';

type SeoEntityType = 'store_category' | 'store_product' | 'store_bundle';

type SeoPanelProps = {
  tenantId: string;
  entityType: SeoEntityType;
  entityId: string;
};

type SeoForm = {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noIndex: boolean;
};

const EMPTY: SeoForm = {
  title: '', description: '', keywords: '', ogTitle: '',
  ogDescription: '', ogImageUrl: '', canonicalUrl: '', noIndex: false,
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function SeoPanel({ tenantId, entityType, entityId }: SeoPanelProps) {
  const [form, setForm] = useState<SeoForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tenant/${tenantId}/api/seo/${entityType}/${entityId}`);
      const seo = res.data.seo;
      if (seo) {
        setForm({
          title:         seo.title         ?? '',
          description:   seo.description   ?? '',
          keywords:      (seo.keywords ?? []).join(', '),
          ogTitle:       seo.ogTitle        ?? '',
          ogDescription: seo.ogDescription  ?? '',
          ogImageUrl:    seo.ogImageUrl     ?? '',
          canonicalUrl:  seo.canonicalUrl   ?? '',
          noIndex:       seo.noIndex        ?? false,
        });
      }
    } catch {
      // no seo yet — keep empty form
    } finally { setLoading(false); }
  }, [tenantId, entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await api.put(`/tenant/${tenantId}/api/seo/${entityType}/${entityId}`, {
        title:         form.title         || undefined,
        description:   form.description   || undefined,
        keywords:      form.keywords ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
        ogTitle:       form.ogTitle        || undefined,
        ogDescription: form.ogDescription  || undefined,
        ogImageUrl:    form.ogImageUrl     || undefined,
        canonicalUrl:  form.canonicalUrl   || undefined,
        noIndex:       form.noIndex,
      });
      toast.success('SEO saved');
    } catch (err) {
      setError(extractMessage(err, 'Failed to save SEO.'));
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {error && <AlertBanner variant="error" message={error} />}

      <Card>
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Basic SEO</h3>
          <Input
            id="seo-title" label="Title" value={form.title}
            hint="Recommended: 50–60 characters"
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Recommended: 120–160 characters"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Input
            id="seo-keywords" label="Keywords (comma-separated)" value={form.keywords}
            hint="e.g. electronics, laptop, gaming"
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox" checked={form.noIndex}
              onChange={(e) => setForm((f) => ({ ...f, noIndex: e.target.checked }))}
            />
            No-index (hide from search engines)
          </label>
          <Input
            id="seo-canonical" label="Canonical URL" value={form.canonicalUrl}
            hint="Leave empty to use the default page URL"
            onChange={(e) => setForm((f) => ({ ...f, canonicalUrl: e.target.value }))}
          />
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Open Graph (Social)</h3>
          <Input
            id="seo-ogtitle" label="OG Title" value={form.ogTitle}
            hint="Defaults to Title if empty"
            onChange={(e) => setForm((f) => ({ ...f, ogTitle: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">OG Description</label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Defaults to Description if empty"
              value={form.ogDescription}
              onChange={(e) => setForm((f) => ({ ...f, ogDescription: e.target.value }))}
            />
          </div>
          <Input
            id="seo-ogimage" label="OG Image URL" value={form.ogImageUrl}
            hint="Recommended: 1200×630 px"
            onChange={(e) => setForm((f) => ({ ...f, ogImageUrl: e.target.value }))}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {saving ? 'Saving…' : 'Save SEO'}
        </Button>
      </div>
    </div>
  );
}

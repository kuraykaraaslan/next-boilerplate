'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { toast } from '@/modules_next/common/ui/toast.store';
import TemplateBlockRenderer from '@/modules_next/dynamic_page/dynamic/partials/TemplateBlockRenderer';

type BlockDef = {
  blockId: string;
  type: string;
  label: string;
  category: string;
  description: string;
  template: string;
  script: string;
  defaultProps: Record<string, unknown>;
  isSystem: boolean;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function BlockDetailPage({ params }: { params: Promise<{ tenantId: string; blockId: string }> }) {
  const { tenantId, blockId } = use(params);
  const router = useRouter();

  const [block, setBlock] = useState<BlockDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ label: '', category: '', description: '', template: '', script: '' });
  const [defaultPropsText, setDefaultPropsText] = useState('{}');
  const [jsonError, setJsonError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/dynamic-pages/block-definitions/${blockId}`)
      .then((r) => {
        const b: BlockDef = r.data.block;
        setBlock(b);
        setForm({ label: b.label, category: b.category, description: b.description ?? '', template: b.template ?? '', script: b.script ?? '' });
        setDefaultPropsText(JSON.stringify(b.defaultProps ?? {}, null, 2));
      })
      .catch((err) => setError(extractMessage(err, 'Failed to load block.')))
      .finally(() => setLoading(false));
  }, [tenantId, blockId]);

  async function handleSave() {
    let parsedProps: Record<string, unknown>
    try {
      parsedProps = JSON.parse(defaultPropsText)
    } catch {
      setJsonError('Invalid JSON in defaultProps')
      return
    }
    setJsonError('')
    setSaving(true)
    try {
      await api.patch(`/tenant/${tenantId}/api/dynamic-pages/block-definitions/${blockId}`, {
        ...form,
        defaultProps: parsedProps,
      })
      toast.success('Block saved')
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to save block.'))
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 text-text-secondary text-sm">Loading…</div>
  if (error) return <AlertBanner variant="error" message={error} />

  const inputCls = 'w-full px-3 py-2 rounded-md text-sm text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 focus:border-[var(--primary)]/40 transition-colors'

  return (
    <div className="space-y-6">
      <PageHeader
        title={block?.label ?? 'Block'}
        subtitle={block?.isSystem ? 'System block (read-only)' : `Type: ${block?.type}`}
        actions={block?.isSystem ? [] : [
          { label: 'Save', onClick: handleSave, disabled: saving },
          { label: 'Back', onClick: () => router.push(`/tenant/${tenantId}/admin/blocks`), variant: 'ghost' as const },
        ]}
      />

      {block?.isSystem && (
        <AlertBanner variant="warning" message="This is a system block definition and cannot be edited." />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Input id="b-label" label="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} disabled={block?.isSystem} />
          <Input id="b-cat" label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} disabled={block?.isSystem} />
          <Input id="b-desc" label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={block?.isSystem} />

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Default Props (JSON)</label>
            <textarea
              value={defaultPropsText}
              onChange={(e) => { setDefaultPropsText(e.target.value); setJsonError('') }}
              rows={10}
              disabled={block?.isSystem}
              className={`${inputCls} resize-none font-mono text-xs ${jsonError ? 'border-red-500/60' : ''}`}
            />
            {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-text-secondary">HTML Template</label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                {showPreview ? 'Hide preview' : 'Show preview'}
              </button>
            </div>
            <textarea
              value={form.template}
              onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
              rows={12}
              disabled={block?.isSystem}
              placeholder={'<div class="...">\n  {{title}}\n</div>'}
              className={`${inputCls} resize-none font-mono text-xs`}
            />
            <p className="text-[11px] text-text-secondary mt-1">Use {'{{propName}}'} for token replacement.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">JavaScript (optional)</label>
            <textarea
              value={form.script}
              onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))}
              rows={4}
              disabled={block?.isSystem}
              placeholder="// Injected once into <body>"
              className={`${inputCls} resize-none font-mono text-xs`}
            />
          </div>
        </div>
      </div>

      {showPreview && form.template && (
        <div className="border border-[var(--text-primary)]/10 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[var(--surface-raised)] border-b border-[var(--text-primary)]/10 text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Preview (with default props)
          </div>
          <div className="bg-white">
            <TemplateBlockRenderer
              template={form.template}
              props={(() => { try { return JSON.parse(defaultPropsText) } catch { return {} } })()}
            />
          </div>
        </div>
      )}

      {!block?.isSystem && (
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => router.push(`/tenant/${tenantId}/admin/blocks`)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
        </div>
      )}
    </div>
  );
}

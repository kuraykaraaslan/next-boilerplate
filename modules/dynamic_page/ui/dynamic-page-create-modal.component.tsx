'use client';

import { useState } from 'react';
import api from '@nb/common/server/axios';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Modal } from '@nb/common/ui/modal.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { PAGE_TEMPLATES } from './page-templates';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'page'
}

interface Props {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onCreated: (pageId: string) => void;
}

type Step = 'template' | 'details';

export function DynamicPageCreateModal({ open, tenantId, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank');
  const [form, setForm] = useState({ title: '', slug: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function handleClose() {
    setStep('template');
    setSelectedTemplateId('blank');
    setForm({ title: '', slug: '' });
    setFormError('');
    onClose();
  }

  async function handleCreate() {
    setSaving(true); setFormError('');
    const template = PAGE_TEMPLATES.find((t) => t.id === selectedTemplateId);
    // Assign stable unique IDs derived from the timestamp so multiple pages don't share block IDs
    const sections = (template?.sections ?? []).map((block, i) => ({
      ...block,
      id: `${block.id}-${Date.now()}-${i}`,
    }));
    try {
      const res = await api.post(`/tenant/${tenantId}/api/dynamic-pages`, {
        title: form.title,
        slug: form.slug.trim() || slugify(form.title),
        status: 'DRAFT',
        sections,
      });
      setForm({ title: '', slug: '' });
      setStep('template');
      setSelectedTemplateId('blank');
      onClose();
      onCreated(res.data.page.dynamicPageId);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setFormError(e?.response?.data?.message ?? e?.message ?? 'Failed to create page.');
    } finally { setSaving(false); }
  }

  const footer = step === 'template' ? (
    <>
      <Button variant="ghost" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={() => setStep('details')}>
        Continue
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={() => setStep('template')} disabled={saving}>Back</Button>
      <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!form.title}>
        Create &amp; Edit
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'template' ? 'Choose a Template' : 'Page Details'}
      footer={footer}
    >
      {step === 'template' && (
        <div className="grid grid-cols-2 gap-3">
          {PAGE_TEMPLATES.map((tpl) => {
            const isSelected = tpl.id === selectedTemplateId;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div
                  className={`w-full h-16 rounded-lg mb-3 flex items-center justify-center text-xs font-medium ${
                    tpl.id === 'blank'
                      ? 'border-2 border-dashed border-border text-text-secondary'
                      : 'bg-surface-overlay text-text-secondary'
                  }`}
                >
                  {tpl.id === 'blank' ? '+ Blank' : `${tpl.sections.length} blocks`}
                </div>
                <p className={`text-sm font-semibold mb-0.5 ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                  {tpl.name}
                </p>
                <p className="text-xs text-text-secondary leading-snug">{tpl.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <div className="px-3 py-2 rounded-lg bg-surface-overlay text-xs text-text-secondary">
            Template: <span className="font-medium text-text-primary">
              {PAGE_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name}
            </span>
          </div>
          <Input
            id="pg-title" label="Title" required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Input
            id="pg-slug" label="Slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            hint="Leave empty to auto-generate from title"
          />
        </div>
      )}
    </Modal>
  );
}

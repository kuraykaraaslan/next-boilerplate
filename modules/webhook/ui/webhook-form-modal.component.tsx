'use client';

import { useState } from 'react';
import { Input } from '@nb/common/ui/input.component';
import { Button } from '@nb/common/ui/button.component';
import { Modal } from '@nb/common/ui/modal.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import type { WebhookEvent } from '@nb/webhook/server/webhook.enums';
import type { Webhook } from './webhook.types';

type EventGroup = { group: string; events: { event: WebhookEvent; description: string }[] };

type Props = {
  open: boolean;
  onClose: () => void;
  initialData: Webhook | null;
  isRoot: boolean;
  eventGroups: EventGroup[];
  onSave: (payload: Record<string, unknown>) => Promise<void>;
};

type FormState = {
  name: string;
  description: string;
  url: string;
  events: WebhookEvent[];
  tagsText: string;
  headerRows: { key: string; value: string }[];
  filtersText: string;
  rateLimitText: string;
};

function toFormState(w: Webhook | null): FormState {
  if (!w) return { name: '', description: '', url: '', events: [], tagsText: '', headerRows: [], filtersText: '', rateLimitText: '' };
  return {
    name: w.name,
    description: w.description ?? '',
    url: w.url,
    events: w.events,
    tagsText: (w.tags ?? []).join(', '),
    headerRows: Object.entries(w.headers ?? {}).map(([key, value]) => ({ key, value })),
    filtersText: w.eventFilters ? JSON.stringify(w.eventFilters, null, 2) : '',
    rateLimitText: w.rateLimitPerMinute != null ? String(w.rateLimitPerMinute) : '',
  };
}

export function WebhookFormModal({ open, onClose, initialData, isRoot, eventGroups, onSave }: Props) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialData));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Re-seed form when initialData changes (edit vs create).
  const editingId = initialData?.webhookId ?? null;

  function toggleEvent(event: WebhookEvent) {
    setForm((p) => ({
      ...p,
      events: p.events.includes(event) ? p.events.filter((e) => e !== event) : [...p.events, event],
    }));
  }

  function addHeaderRow() { setForm((p) => ({ ...p, headerRows: [...p.headerRows, { key: '', value: '' }] })); }
  function updateHeaderRow(i: number, field: 'key' | 'value', val: string) {
    setForm((p) => ({ ...p, headerRows: p.headerRows.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }));
  }
  function removeHeaderRow(i: number) {
    setForm((p) => ({ ...p, headerRows: p.headerRows.filter((_, idx) => idx !== i) }));
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (!form.url.trim())  { setFormError('URL is required.');  return; }
    if (form.events.length === 0) { setFormError('Select at least one event.'); return; }

    const tags = form.tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const headers: Record<string, string> = {};
    for (const row of form.headerRows) { const k = row.key.trim(); if (k) headers[k] = row.value; }

    let eventFilters: Record<string, unknown> | undefined;
    if (form.filtersText.trim()) {
      try { eventFilters = JSON.parse(form.filtersText); }
      catch { setFormError('Event filters must be valid JSON.'); return; }
    }

    let rateLimitPerMinute: number | null = null;
    if (form.rateLimitText.trim()) {
      const n = parseInt(form.rateLimitText, 10);
      if (!Number.isFinite(n) || n < 1) { setFormError('Rate limit must be a positive whole number.'); return; }
      rateLimitPerMinute = n;
    }

    const payload: Record<string, unknown> = { name: form.name, description: form.description, url: form.url, events: form.events };
    if (editingId) {
      payload.tags = tags.length ? tags : null;
      payload.headers = Object.keys(headers).length ? headers : null;
      payload.eventFilters = eventFilters ?? null;
      payload.rateLimitPerMinute = rateLimitPerMinute;
    } else {
      if (tags.length) payload.tags = tags;
      if (Object.keys(headers).length) payload.headers = headers;
      if (eventFilters) payload.eventFilters = eventFilters;
      if (rateLimitPerMinute != null) payload.rateLimitPerMinute = rateLimitPerMinute;
    }

    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? err?.message ?? (editingId ? 'Failed to update.' : 'Failed to create.'));
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setForm(toFormState(initialData));
    setFormError('');
    onClose();
  }

  const title = editingId
    ? (isRoot ? 'Edit Platform Webhook' : 'Edit Webhook')
    : (isRoot ? 'New Platform Webhook' : 'New Webhook');

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="lg"
      className="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>{editingId ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError && <AlertBanner variant="error" message={formError} />}

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          {/* Left column: core fields */}
          <div className="space-y-4">
            <Input id="webhook-name" label="Name" placeholder="My webhook" value={form.name} required
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input id="webhook-url" label="URL" placeholder="https://your-service.com/webhook" value={form.url} required
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
            <Input id="webhook-description" label="Description (optional)" placeholder="What is this webhook for?"
              value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <Input id="webhook-tags" label="Tags (optional, comma-separated)" placeholder="billing, prod"
              value={form.tagsText} onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} />
            <Input id="webhook-rate-limit" label="Rate limit (optional, deliveries/minute)" type="number" placeholder="Unlimited"
              value={form.rateLimitText} onChange={(e) => setForm((p) => ({ ...p, rateLimitText: e.target.value }))} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-text-primary">Custom headers (optional)</p>
                <Button type="button" variant="ghost" size="sm" onClick={addHeaderRow}>Add header</Button>
              </div>
              {form.headerRows.length === 0 ? (
                <p className="text-xs text-text-secondary">No custom headers. Reserved headers (Content-Type, X-Webhook-*, User-Agent) can&apos;t be overridden.</p>
              ) : (
                <div className="space-y-2">
                  {form.headerRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className="min-w-0 flex-1 rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono"
                        placeholder="X-Custom-Header" value={row.key} onChange={(e) => updateHeaderRow(i, 'key', e.target.value)} />
                      <input className="min-w-0 flex-1 rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono"
                        placeholder="value" value={row.value} onChange={(e) => updateHeaderRow(i, 'value', e.target.value)} />
                      <button type="button" onClick={() => removeHeaderRow(i)}
                        className="text-text-secondary hover:text-error px-1" aria-label="Remove header">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: events + filters */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Events</p>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {eventGroups.map(({ group, events }) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {events.map(({ event: ev, description }) => {
                        const selected = form.events.includes(ev);
                        return (
                          <button key={ev} type="button" title={description} onClick={() => toggleEvent(ev)}
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-mono transition-colors ${
                              selected ? 'bg-primary text-primary-fg border-primary' : 'bg-surface-base text-text-secondary border-border hover:border-primary'
                            }`}>
                            {ev}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-text-primary mb-1">Event filters (optional, advanced)</p>
              <p className="text-xs text-text-secondary mb-2">
                JSON map of <code>{'{ "event": { "data.path": value } }'}</code>. A delivery is skipped when the payload doesn&apos;t match.
              </p>
              <textarea className="w-full rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono min-h-24"
                placeholder={'{\n  "payment.completed": { "currency": "USD" }\n}'}
                value={form.filtersText} onChange={(e) => setForm((p) => ({ ...p, filtersText: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

'use client';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { AIChatBox } from '@kuraykaraaslan/ai_chat/ui/ai-chat-box.component';

type ChatProfile = { id: string; name: string; provider: string; model: string; systemPrompt: string };
type ProviderInfo = { provider: string; configured: boolean };
type ModelInfo = { model: string; provider: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/**
 * AI Chat with named profiles. Each profile pins a provider + model + default
 * system prompt; the active profile drives the chat widget. Provider/model are
 * sent explicitly to /api/ai/{chat,stream} → AIService, so it works with any
 * provider (built-in or community) and the chosen model — agnostic.
 */
export default function AiChatPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const base = `/tenant/${tenantId}/api/ai`;

  const [profiles, setProfiles] = useState<ChatProfile[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [prof, prov, mods] = await Promise.all([
          api.get(`${base}/chat/profiles`).catch(() => ({ data: { profiles: [] } })),
          api.get(`${base}/providers`).catch(() => ({ data: { providers: [] } })),
          api.get(`${base}/models`).catch(() => ({ data: { models: [] } })),
        ]);
        const list: ChatProfile[] = prof.data.profiles ?? [];
        setProfiles(list);
        setActiveId(list[0]?.id ?? '');
        setProviders(prov.data.providers ?? []);
        setModels(mods.data.models ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [base]);

  const active = useMemo(() => profiles.find((p) => p.id === activeId) ?? null, [profiles, activeId]);

  const providerOptions = providers.map((p) => ({
    value: p.provider,
    label: p.configured ? p.provider : `${p.provider} (not configured)`,
  }));
  const modelOptions = useMemo(() => {
    const ms = models.filter((m) => m.provider === active?.provider).map((m) => ({ value: m.model, label: m.model }));
    return [{ value: '', label: '(provider default)' }, ...ms];
  }, [models, active?.provider]);

  const patchActive = useCallback((patch: Partial<ChatProfile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
  }, [activeId]);

  const addProfile = useCallback(() => {
    const id = crypto.randomUUID();
    const firstProvider = providers.find((p) => p.configured)?.provider ?? providers[0]?.provider ?? '';
    const p: ChatProfile = { id, name: `Profile ${profiles.length + 1}`, provider: firstProvider, model: '', systemPrompt: '' };
    setProfiles((prev) => [...prev, p]);
    setActiveId(id);
  }, [profiles.length, providers]);

  const deleteActive = useCallback(() => {
    if (!active) return;
    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== active.id);
      setActiveId(next[0]?.id ?? '');
      return next;
    });
  }, [active]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await api.put(`${base}/chat/profiles`, { profiles });
      setProfiles(res.data.profiles ?? profiles);
      toast.success('Chat profiles saved');
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to save profiles.'));
    } finally {
      setSaving(false);
    }
  }, [base, profiles]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const activeConfigured = providers.find((p) => p.provider === active?.provider)?.configured;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Chat"
        subtitle="Profiles — each pins a provider, model, and default system prompt"
      />

      <Card title="Profiles">
        <div className="space-y-4">
          <div className="flex items-end gap-2 flex-wrap">
            <Select
              id="active-profile"
              label="Active profile"
              className="min-w-56"
              options={profiles.length ? profiles.map((p) => ({ value: p.id, label: p.name })) : [{ value: '', label: 'No profiles yet' }]}
              value={activeId}
              onChange={(e) => setActiveId(e.target.value)}
            />
            <Button variant="secondary" onClick={addProfile}>New profile</Button>
            {active && <Button variant="danger" onClick={deleteActive}>Delete</Button>}
            <span className="flex-1" />
            <Button variant="primary" loading={saving} onClick={save}>Save</Button>
          </div>

          {active ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="p-name" label="Name" value={active.name} onChange={(e) => patchActive({ name: e.target.value })} />
              <Select
                id="p-provider"
                label="Provider"
                options={providerOptions.length ? providerOptions : [{ value: '', label: 'No providers' }]}
                value={active.provider}
                onChange={(e) => patchActive({ provider: e.target.value, model: '' })}
              />
              <Select
                id="p-model"
                label="Model"
                options={modelOptions}
                value={active.model}
                onChange={(e) => patchActive({ model: e.target.value })}
              />
              <div className="flex items-end">
                <Badge variant={activeConfigured ? 'success' : 'neutral'} dot>
                  {activeConfigured ? 'Provider configured' : 'Provider not configured'}
                </Badge>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="p-sys" className="block text-sm font-medium text-text-secondary mb-1">Default system prompt</label>
                <textarea
                  id="p-sys"
                  rows={4}
                  value={active.systemPrompt}
                  onChange={(e) => patchActive({ systemPrompt: e.target.value })}
                  placeholder="e.g. You are a concise coding assistant."
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No profiles yet — create one to pin a provider, model, and system prompt.</p>
          )}
        </div>
      </Card>

      <p className="text-sm text-text-secondary">
        {active
          ? <>Open the chat widget (bottom-right) to chat as <span className="font-medium">{active.name}</span> — {active.provider}{active.model ? ` / ${active.model}` : ''}.</>
          : <>Open the chat widget (bottom-right) to chat with the tenant&apos;s default provider.</>}
      </p>

      <AIChatBox
        key={active?.id ?? 'default'}
        tenantId={tenantId}
        provider={active?.provider || undefined}
        model={active?.model || undefined}
        systemPrompt={active?.systemPrompt || undefined}
        title={active ? active.name : 'AI Chat'}
        subtitle={active ? `${active.provider}${active.model ? ` · ${active.model}` : ''}` : 'Uses the selected provider'}
      />
    </div>
  );
}

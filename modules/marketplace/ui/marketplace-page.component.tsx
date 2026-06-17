'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';

interface CatalogModule extends Record<string, unknown> {
  id: string;
  name: string;
  icon?: string;
  tier?: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  enabled: boolean;
  defaultOn: boolean;
  installed: boolean;
  installedAt: string | null;
  installedVersion: string | null;
}

interface DeletePreview {
  moduleId: string;
  tenantTables: string[];
  skippedTables: string[];
  dependents: string[];
}

interface CommunityListing {
  listingId: string;
  scopedName: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  repoUrl: string | null;
  homepage: string | null;
  publisherSlug: string | null;
  version: string | null;
  installed?: boolean;
  active?: boolean;
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/** State of a catalog module: 'available' | 'active' | 'inactive'. */
function stateOf(m: CatalogModule): 'available' | 'active' | 'inactive' {
  if (!m.installed) return 'available';
  return m.enabled ? 'active' : 'inactive';
}

export function MarketplacePage({ tenantId }: { tenantId: string }) {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Delete-confirm modal state.
  const [deleting, setDeleting] = useState<CatalogModule | null>(null);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [community, setCommunity] = useState<CommunityListing[]>([]);

  const base = `/tenant/${tenantId}/api/marketplace`;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [res, comm] = await Promise.all([
        api.get(base),
        api.get(`${base}/community`).catch(() => ({ data: { listings: [] } })),
      ]);
      setModules(res.data.modules ?? []);
      setCommunity(comm.data.listings ?? []);
    } catch (err) {
      setError(extractMessage(err, 'Failed to load marketplace.'));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { load(); }, [load]);

  const refresh = (mods: CatalogModule[]) => setModules(mods ?? []);

  const doInstall = useCallback(async (m: CatalogModule) => {
    setBusy(m.id);
    try {
      const res = await api.post(`${base}/${m.id}/install`);
      refresh(res.data.modules);
      toast.success(`${m.name} installed`);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to install module.'));
    } finally {
      setBusy(null);
    }
  }, [base]);

  const doSetActive = useCallback(async (m: CatalogModule, active: boolean) => {
    setBusy(m.id);
    try {
      const res = await api.put(`${base}/${m.id}`, { active });
      refresh(res.data.modules);
      toast.success(`${m.name} ${active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to update module.'));
    } finally {
      setBusy(null);
    }
  }, [base]);

  const openDelete = useCallback(async (m: CatalogModule) => {
    setDeleting(m);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const res = await api.get(`${base}/${m.id}`, { params: { preview: 'delete' } });
      setPreview(res.data.preview);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to load delete preview.'));
    } finally {
      setPreviewLoading(false);
    }
  }, [base]);

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    const m = deleting;
    setBusy(m.id);
    try {
      const cascade = (preview?.dependents.length ?? 0) > 0;
      const res = await api.delete(`${base}/${m.id}`, { data: { cascade } });
      refresh(res.data.modules);
      const r = res.data.result;
      toast.success(`${m.name} uninstalled — ${r?.rowsDeleted ?? 0} rows purged from ${r?.tablesPurged?.length ?? 0} table(s)`);
      setDeleting(null);
      setPreview(null);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to uninstall module.'));
    } finally {
      setBusy(null);
    }
  }, [base, deleting, preview]);

  const communityAction = useCallback(async (c: CommunityListing, action: 'install' | 'uninstall') => {
    setBusy(c.listingId);
    try {
      await api.put(`${base}/community/${c.listingId}`, { action });
      toast.success(`${c.name} ${action === 'install' ? 'installed' : 'removed'}`);
      await load();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to update plugin.'));
    } finally {
      setBusy(null);
    }
  }, [base, load]);

  const grouped = useMemo(() => {
    const by: Record<string, CatalogModule[]> = {};
    for (const m of modules) (by[m.tier || 'other'] ??= []).push(m);
    for (const k of Object.keys(by)) by[k].sort((a, b) => a.name.localeCompare(b.name));
    return Object.entries(by).sort(([a], [b]) => a.localeCompare(b));
  }, [modules]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const installedCount = modules.filter((m) => m.installed).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        subtitle={`${installedCount} of ${modules.length} modules installed`}
      />
      {error && <AlertBanner variant="error" message={error} dismissible />}

      {grouped.map(([tier, mods]) => (
        <section key={tier} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">{tier}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mods.map((m) => {
              const state = stateOf(m);
              return (
                <div key={m.id} className="flex flex-col rounded-xl border border-border bg-surface-raised p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {m.icon && <i className={`${m.icon} text-text-secondary`} aria-hidden />}
                        <span className="font-medium text-text-primary truncate">{m.name}</span>
                      </div>
                      <code className="text-xs text-text-tertiary">{m.id}</code>
                    </div>
                    {state === 'active' && <Badge variant="success" size="sm">Active</Badge>}
                    {state === 'inactive' && <Badge variant="neutral" size="sm">Inactive</Badge>}
                    {state === 'available' && m.defaultOn && <Badge variant="info" size="sm">Recommended</Badge>}
                  </div>

                  {m.description && (
                    <p className="mt-2 text-xs text-text-secondary line-clamp-2 flex-1">{m.description}</p>
                  )}

                  <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
                    <Badge variant="neutral" size="sm">v{m.version}</Badge>
                    {m.installed && m.installedAt && (
                      <span>installed {new Date(m.installedAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {state === 'available' && (
                      <Button size="sm" variant="primary" loading={busy === m.id} onClick={() => doInstall(m)}>
                        Install
                      </Button>
                    )}
                    {state === 'active' && (
                      <Button size="sm" variant="secondary" loading={busy === m.id} onClick={() => doSetActive(m, false)}>
                        Deactivate
                      </Button>
                    )}
                    {state === 'inactive' && (
                      <Button size="sm" variant="primary" loading={busy === m.id} onClick={() => doSetActive(m, true)}>
                        Activate
                      </Button>
                    )}
                    {m.installed && (
                      <Button size="sm" variant="danger" disabled={busy === m.id} onClick={() => openDelete(m)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {community.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">Community</h2>
            <p className="text-xs text-text-tertiary">Published by verified developers. Listing only — not yet installable from here.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {community.map((c) => (
              <div key={c.listingId} className="flex flex-col rounded-xl border border-border bg-surface-raised p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {c.icon && <i className={`${c.icon} text-text-secondary`} aria-hidden />}
                      <span className="font-medium text-text-primary truncate">{c.name}</span>
                    </div>
                    <code className="text-xs text-text-tertiary">{c.scopedName}</code>
                  </div>
                  <Badge variant="warning" size="sm">External</Badge>
                </div>
                {c.description && <p className="mt-2 text-xs text-text-secondary line-clamp-2 flex-1">{c.description}</p>}
                <div className="mt-3 flex items-center gap-2">
                  {c.version && <Badge variant="neutral" size="sm">v{c.version}</Badge>}
                  {c.installed && <Badge variant="success" size="sm">Installed</Badge>}
                  {(c.repoUrl || c.homepage) && (
                    <a className="text-xs text-primary hover:underline" href={c.repoUrl || c.homepage || '#'} target="_blank" rel="noopener noreferrer">
                      Details
                    </a>
                  )}
                  <span className="flex-1" />
                  {c.installed ? (
                    <Button size="sm" variant="danger" disabled={busy === c.listingId} onClick={() => communityAction(c, 'uninstall')}>Remove</Button>
                  ) : (
                    <Button size="sm" variant="primary" loading={busy === c.listingId} onClick={() => communityAction(c, 'install')}>Install</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={!!deleting}
        onClose={() => { setDeleting(null); setPreview(null); }}
        title={deleting ? `Delete "${deleting.name}"?` : ''}
        description="This uninstalls the module and permanently purges its data for this tenant."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setDeleting(null); setPreview(null); }}>Cancel</Button>
            <Button variant="danger" loading={!!busy && busy === deleting?.id} disabled={previewLoading} onClick={confirmDelete}>
              Delete &amp; purge data
            </Button>
          </div>
        }
      >
        {previewLoading && <div className="flex justify-center py-6"><Spinner /></div>}
        {preview && (
          <div className="space-y-3 text-sm">
            {preview.dependents.length > 0 && (
              <AlertBanner
                variant="warning"
                message={`Also required by: ${preview.dependents.join(', ')}. These will be uninstalled and purged too (cascade).`}
              />
            )}
            <div>
              <p className="font-medium text-text-primary">Tables to purge ({preview.tenantTables.length}):</p>
              {preview.tenantTables.length ? (
                <ul className="mt-1 list-disc pl-5 text-text-secondary">
                  {preview.tenantTables.map((t) => <li key={t}><code>{t}</code></li>)}
                </ul>
              ) : <p className="text-text-tertiary">No tenant-scoped tables.</p>}
            </div>
            {preview.skippedTables.length > 0 && (
              <p className="text-xs text-text-tertiary">
                Not auto-purged (no tenantId column): {preview.skippedTables.map((t) => <code key={t} className="mr-1">{t}</code>)}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

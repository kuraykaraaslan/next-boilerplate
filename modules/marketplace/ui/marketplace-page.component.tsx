'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { SearchBar } from '@kuraykaraaslan/common/ui/search-bar.component';
import { Pagination } from '@kuraykaraaslan/common/ui/pagination.component';
import { EmptyState } from '@kuraykaraaslan/common/ui/empty-state.component';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { resolveIcon, DEFAULT_ICON } from '@kuraykaraaslan/common/ui/icon-map';
import { PluginConfigModal } from './plugin-config-modal.component';

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
  protected: boolean;
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
  pricing?: string | null;
  repoUrl: string | null;
  homepage: string | null;
  publisherSlug: string | null;
  version: string | null;
  installed?: boolean;
  active?: boolean;
}

type Tab = 'installed' | 'marketplace';

/** How many cards per page in the grid. */
const PER_PAGE = 12;

/** A normalized, searchable plugin — either a built-in module or a community listing. */
type Item =
  | { kind: 'module'; key: string; installed: boolean; category: string; pricing: string; search: string; mod: CatalogModule }
  | { kind: 'community'; key: string; installed: boolean; category: string; pricing: string; search: string; listing: CommunityListing };

const TIER_LABELS: Record<string, string> = { other: 'General', ai: 'AI' };
const PRICING_LABELS: Record<string, string> = { free: 'Free', premium: 'Premium' };

function categoryLabel(id: string): string {
  if (id === 'all') return 'All';
  return TIER_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function pricingLabel(id: string): string {
  if (id === 'all') return 'All';
  return PRICING_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/** Build an "All + values (by size)" pill option list from a key extractor. */
function buildFacet(items: Item[], key: (it: Item) => string): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(key(it), (counts.get(key(it)) ?? 0) + 1);
  const values = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const ordered: { id: string; count: number }[] = [{ id: 'all', count: items.length }];
  for (const [id, count] of values) ordered.push({ id, count });
  return ordered;
}

/** A rounded filter pill with a count badge (used for category + pricing facets). */
function FilterPill({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
        active
          ? 'border-primary bg-primary text-primary-fg'
          : 'border-border text-text-secondary hover:bg-surface-overlay hover:text-text-primary',
      )}
    >
      {label}
      <span className={cn('tabular-nums', active ? 'opacity-80' : 'text-text-tertiary')}>{count}</span>
    </button>
  );
}

/**
 * Unified "Plugins" screen (WordPress/Odoo-style): one list of plugins — built-in
 * modules and community plugins alike — split into Installed vs Available tabs.
 * Installed → enable/disable, configure, uninstall; Available → install. Both
 * `/admin/modules` (defaults to Installed) and `/admin/marketplace` (Available)
 * render this.
 */
export function MarketplacePage({ tenantId, defaultTab = 'marketplace' }: { tenantId: string; defaultTab?: Tab }) {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [community, setCommunity] = useState<CommunityListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Browse state.
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [category, setCategory] = useState('all');
  const [pricing, setPricing] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // Modals.
  const [deleting, setDeleting] = useState<CatalogModule | null>(null);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [configuring, setConfiguring] = useState<CommunityListing | null>(null);

  const base = `/tenant/${tenantId}/api/marketplace`;
  const modulesBase = `/tenant/${tenantId}/api/modules`;

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
      setError(extractMessage(err, 'Failed to load plugins.'));
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

  // Enable/disable a built-in module (works for installed + default-on; core can't disable).
  const doToggle = useCallback(async (m: CatalogModule, enabled: boolean) => {
    setBusy(m.id);
    try {
      await api.put(modulesBase, { id: m.id, enabled });
      await load();
      toast.success(`${m.name} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to update module.'));
    } finally {
      setBusy(null);
    }
  }, [modulesBase, load]);

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
    // Don't break the dependency chain — blocked when other modules still require it.
    if ((preview?.dependents.length ?? 0) > 0) return;
    const m = deleting;
    setBusy(m.id);
    try {
      const res = await api.delete(`${base}/${m.id}`, { data: { cascade: false } });
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

  // Normalize built-in modules + community listings into one searchable list.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const m of modules) {
      out.push({
        kind: 'module',
        key: `m:${m.id}`,
        installed: m.installed,
        category: m.tier || 'other',
        // Pricing tier — everything is free for now; premium plugins will set this.
        pricing: (typeof m.pricing === 'string' && m.pricing) || 'free',
        search: `${m.name} ${m.id} ${m.description} ${(m.tags || []).join(' ')}`.toLowerCase(),
        mod: m,
      });
    }
    for (const c of community) {
      out.push({
        kind: 'community',
        key: `c:${c.listingId}`,
        installed: !!c.installed,
        category: c.tier || 'other',
        pricing: (typeof c.pricing === 'string' && c.pricing) || 'free',
        search: `${c.name} ${c.scopedName} ${c.description ?? ''}`.toLowerCase(),
        listing: c,
      });
    }
    return out;
  }, [modules, community]);

  const installedCount = items.filter((it) => it.installed).length;

  // Installed tab → only installed; Marketplace tab → everything (installed badged).
  const tabItems = useMemo(
    () => (tab === 'installed' ? items.filter((it) => it.installed) : items),
    [items, tab],
  );

  // Category pills (tiers, e.g. AI) and pricing pills (Free / Premium) — both within the current tab.
  const categories = useMemo(() => buildFacet(tabItems, (it) => it.category), [tabItems]);
  const pricings = useMemo(() => buildFacet(tabItems, (it) => it.pricing), [tabItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tabItems
      .filter((it) => category === 'all' || it.category === category)
      .filter((it) => pricing === 'all' || it.pricing === pricing)
      .filter((it) => !q || it.search.includes(q))
      .sort((a, b) => {
        const an = a.kind === 'module' ? a.mod.name : a.listing.name;
        const bn = b.kind === 'module' ? b.mod.name : b.listing.name;
        return an.localeCompare(bn);
      });
  }, [tabItems, category, pricing, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  const changeTab = useCallback((t: Tab) => { setTab(t); setCategory('all'); setPricing('all'); setQuery(''); setPage(1); }, []);
  const changeCategory = useCallback((id: string) => { setCategory(id); setPage(1); }, []);
  const changePricing = useCallback((id: string) => { setPricing(id); setPage(1); }, []);
  const changeQuery = useCallback((value: string) => { setQuery(value); setPage(1); }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(page * PER_PAGE, filtered.length);

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'installed', label: 'Installed', count: installedCount },
    { id: 'marketplace', label: 'Marketplace', count: items.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plugins"
        subtitle={`${installedCount} installed · ${items.length} total`}
      />
      {error && <AlertBanner variant="error" message={error} dismissible />}

      <div role="tablist" aria-label="Plugin state" className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border',
              )}
            >
              {t.label}
              <span className={cn('tabular-nums text-xs', active ? 'text-primary' : 'text-text-tertiary')}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <SearchBar
          id="plugins-search"
          placeholder="Search plugins…"
          value={query}
          onChange={changeQuery}
          className="max-w-md"
        />
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium text-text-tertiary">Category</span>
          <div role="tablist" aria-label="Categories" className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <FilterPill key={c.id} active={c.id === category} count={c.count} label={categoryLabel(c.id)} onClick={() => changeCategory(c.id)} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium text-text-tertiary">Pricing</span>
          <div role="tablist" aria-label="Pricing" className="flex flex-wrap gap-2">
            {pricings.map((p) => (
              <FilterPill key={p.id} active={p.id === pricing} count={p.count} label={pricingLabel(p.id)} onClick={() => changePricing(p.id)} />
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === 'installed' ? 'No installed plugins' : 'No plugins found'}
          description={
            query
              ? `No plugins match “${query}”.`
              : tab === 'installed'
                ? 'Install plugins from the Marketplace tab.'
                : 'No plugins in this category.'
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>Showing {rangeStart}–{rangeEnd} of {filtered.length}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((it) => (it.kind === 'module' ? renderModuleCard(it.mod) : renderCommunityCard(it.listing)))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <Modal
        open={!!deleting}
        onClose={() => { setDeleting(null); setPreview(null); }}
        title={deleting ? `Delete "${deleting.name}"?` : ''}
        description="This uninstalls the module and permanently purges its data for this tenant."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setDeleting(null); setPreview(null); }}>Cancel</Button>
            <Button
              variant="danger"
              loading={!!busy && busy === deleting?.id}
              disabled={previewLoading || (preview?.dependents.length ?? 0) > 0}
              onClick={confirmDelete}
            >
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
                variant="error"
                message={`Cannot delete — still required by: ${preview.dependents.join(', ')}. Remove those first.`}
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

      <PluginConfigModal
        tenantId={tenantId}
        listingId={configuring?.listingId ?? null}
        pluginName={configuring?.name}
        open={!!configuring}
        onClose={(changed) => { setConfiguring(null); if (changed) load(); }}
      />
    </div>
  );

  function renderModuleCard(m: CatalogModule) {
    const state: 'available' | 'active' | 'inactive' = !m.installed ? 'available' : m.enabled ? 'active' : 'inactive';
    return (
      <div key={m.id} className="flex flex-col rounded-xl border border-border bg-surface-raised p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={resolveIcon(m.icon) ?? DEFAULT_ICON} className="w-4 h-4 shrink-0 text-text-secondary" aria-hidden />
              <span className="font-medium text-text-primary truncate">{m.name}</span>
            </div>
            <code className="text-xs text-text-tertiary">{m.id}</code>
          </div>
          {m.protected ? (
            <Badge variant="info" size="sm">Core</Badge>
          ) : tab === 'marketplace' ? (
            m.installed ? (
              <Badge variant="success" size="sm">Installed</Badge>
            ) : m.defaultOn ? (
              <Badge variant="info" size="sm">Recommended</Badge>
            ) : null
          ) : state === 'active' ? (
            <Badge variant="success" size="sm">Active</Badge>
          ) : state === 'inactive' ? (
            <Badge variant="neutral" size="sm">Inactive</Badge>
          ) : null}
        </div>

        {m.description && <p className="mt-2 text-xs text-text-secondary line-clamp-2 flex-1">{m.description}</p>}

        <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
          <Badge variant="neutral" size="sm">Built-in</Badge>
          <Badge variant="neutral" size="sm">v{m.version}</Badge>
          {m.installed && m.installedAt && <span>installed {new Date(m.installedAt).toLocaleDateString()}</span>}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {tab === 'marketplace' ? (
            m.protected ? (
              <span className="text-xs text-text-tertiary">Always on</span>
            ) : m.installed ? (
              <span className="text-xs text-text-tertiary">Installed — manage in the Installed tab</span>
            ) : (
              <Button size="sm" variant="primary" loading={busy === m.id} onClick={() => doInstall(m)}>Install</Button>
            )
          ) : m.protected ? (
            <span className="text-xs text-text-tertiary">Always on</span>
          ) : (
            <>
              {m.enabled ? (
                <Button size="sm" variant="secondary" loading={busy === m.id} onClick={() => doToggle(m, false)}>Deactivate</Button>
              ) : (
                <Button size="sm" variant="primary" loading={busy === m.id} onClick={() => doToggle(m, true)}>Activate</Button>
              )}
              <Button size="sm" variant="danger" disabled={busy === m.id} onClick={() => openDelete(m)}>Delete</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderCommunityCard(c: CommunityListing) {
    return (
      <div key={c.listingId} className="flex flex-col rounded-xl border border-border bg-surface-raised p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={resolveIcon(c.icon ?? undefined) ?? DEFAULT_ICON} className="w-4 h-4 shrink-0 text-text-secondary" aria-hidden />
              <span className="font-medium text-text-primary truncate">{c.name}</span>
            </div>
            <code className="text-xs text-text-tertiary">{c.scopedName}</code>
          </div>
          <Badge variant="warning" size="sm">Community</Badge>
        </div>
        {c.description && <p className="mt-2 text-xs text-text-secondary line-clamp-2 flex-1">{c.description}</p>}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {c.version && <Badge variant="neutral" size="sm">v{c.version}</Badge>}
          {c.installed && <Badge variant="success" size="sm">Installed</Badge>}
          {(c.repoUrl || c.homepage) && (
            <a className="text-xs text-primary hover:underline" href={c.repoUrl || c.homepage || '#'} target="_blank" rel="noopener noreferrer">Details</a>
          )}
          <span className="flex-1" />
          {tab === 'marketplace' ? (
            c.installed ? (
              <span className="text-xs text-text-tertiary">Installed — manage in the Installed tab</span>
            ) : (
              <Button size="sm" variant="primary" loading={busy === c.listingId} onClick={() => communityAction(c, 'install')}>Install</Button>
            )
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => setConfiguring(c)}>Configure</Button>
              <Button size="sm" variant="danger" disabled={busy === c.listingId} onClick={() => communityAction(c, 'uninstall')}>Remove</Button>
            </>
          )}
        </div>
      </div>
    );
  }
}

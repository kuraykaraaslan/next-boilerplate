'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { EmptyState } from '@kuraykaraaslan/common/ui/empty-state.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUpload, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  type ListingDetail,
  type ListingVersion,
  extractMessage,
  inputCls,
  Field,
  StatusPill,
  VersionStatusBadge,
  StatCard,
  CLIENT_SEMVER_RE,
  formatDate,
} from './developer-shared.component';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function DeveloperListingDetail({ tenantId, listingId }: { tenantId: string; listingId: string }) {
  const base = `/tenant/${tenantId}/api/marketplace`;
  const router = useRouter();
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${base}/listings/${listingId}`);
      setDetail({ listing: res.data.listing, versions: res.data.versions ?? [], stats: res.data.stats ?? { installs: 0, active: 0 } });
    } catch (err) {
      setError(extractMessage(err, 'Failed to load listing.'));
    } finally {
      setLoading(false);
    }
  }, [base, listingId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !detail) {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => router.push(`/tenant/${tenantId}/admin/developer`)} />
        <AlertBanner variant="error" message={error || 'Listing not found.'} />
      </div>
    );
  }

  const { listing, versions, stats } = detail;
  const latest = versions[0];

  return (
    <div className="space-y-6">
      <BackLink onClick={() => router.push(`/tenant/${tenantId}/admin/developer`)} />
      <PageHeader
        title={listing.name}
        subtitle={listing.scopedName}
        badge={<StatusPill status={listing.status} />}
      />

      {latest?.reviewStatus === 'rejected' && (
        <AlertBanner
          variant="error"
          message={`Version ${latest.version} was rejected${latest.reviewNotes ? `: ${latest.reviewNotes}` : '.'} Address the feedback and submit a higher version.`}
        />
      )}

      <SubmitVersionLauncher detail={detail} base={base} onSubmitted={load} busy={busy} setBusy={setBusy} />

      <TabGroup
        tabs={[
          { id: 'overview', label: 'Overview', content: <OverviewTab detail={detail} /> },
          { id: 'versions', label: `Versions${versions.length ? ` (${versions.length})` : ''}`, content: <VersionsTab versions={versions} currentVersionId={listing.currentVersionId ?? null} /> },
          { id: 'analytics', label: 'Analytics', content: <AnalyticsTab stats={stats} /> },
          { id: 'settings', label: 'Settings', content: <SettingsTab detail={detail} base={base} onChanged={load} /> },
        ]}
      />
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
      <FontAwesomeIcon icon={faArrowLeft} aria-hidden /> Back to listings
    </button>
  );
}

// ── Overview ──
function OverviewTab({ detail }: { detail: ListingDetail }) {
  const { listing, versions } = detail;
  const current = versions.find((v) => v.versionId === listing.currentVersionId) ?? versions[0];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Meta label="Description" value={listing.description || '—'} />
        <Meta label="Current version" value={current?.version ?? '—'} />
        <Meta label="Tier" value={listing.tier || '—'} />
        <Meta label="Visibility" value={<span className="capitalize">{listing.visibility}</span>} />
        <Meta label="Repository" value={linkOrDash(listing.repoUrl)} />
        <Meta label="Homepage" value={linkOrDash(listing.homepage)} />
      </div>
      {listing.tags && listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {listing.tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-text-secondary">{t}</span>
          ))}
        </div>
      )}
      {current?.readmeMd && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">README</h3>
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-surface-base p-4 text-xs text-text-secondary">{current.readmeMd}</pre>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-text-tertiary">{label}</div>
      <div className="text-sm text-text-primary break-words">{value}</div>
    </div>
  );
}

function linkOrDash(url?: string | null) {
  if (!url) return '—';
  return <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{url}</a>;
}

// ── Versions ──
function VersionsTab({ versions, currentVersionId }: { versions: ListingVersion[]; currentVersionId: string | null }) {
  if (versions.length === 0) {
    return <EmptyState title="No versions yet" description="Submit your first version for review using the button above." />;
  }
  return (
    <ol className="space-y-3">
      {versions.map((v) => (
        <li key={v.versionId} className="rounded-xl border border-border bg-surface-raised p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-text-primary">v{v.version}</span>
            <VersionStatusBadge status={v.reviewStatus} />
            {v.versionId === currentVersionId && (
              <span className="rounded-full bg-success-subtle px-2 py-0.5 text-[10px] font-medium text-success-fg">current</span>
            )}
            <span className="ml-auto text-xs text-text-tertiary">
              Submitted {formatDate(v.submittedAt)}{v.reviewedAt ? ` · Reviewed ${formatDate(v.reviewedAt)}` : ''}
            </span>
          </div>
          {v.changelog && <p className="mt-2 text-sm text-text-secondary">{v.changelog}</p>}
          {v.reviewStatus === 'rejected' && v.reviewNotes && (
            <div className="mt-2 rounded-lg border border-error bg-error-subtle px-3 py-2 text-xs text-error-fg">
              <span className="font-medium">Reviewer notes: </span>{v.reviewNotes}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-tertiary">
            {v.bundleKey && <span>Bundle attached</span>}
            {v.packageRef && <span>Ref: <code>{v.packageRef}</code></span>}
            {v.screenshots && v.screenshots.length > 0 && <span>{v.screenshots.length} screenshot(s)</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Analytics ──
function AnalyticsTab({ stats }: { stats: { installs: number; active: number } }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total installs" value={stats.installs} />
        <StatCard label="Active installs" value={stats.active} />
        <StatCard label="Inactive" value={Math.max(0, stats.installs - stats.active)} />
      </div>
      <p className="text-xs text-text-tertiary">
        Install counts cover tenants that have installed the published listing across the platform.
      </p>
    </div>
  );
}

// ── Settings (edit metadata + lifecycle) ──
function SettingsTab({ detail, base, onChanged }: { detail: ListingDetail; base: string; onChanged: () => Promise<void> }) {
  const { listing } = detail;
  const [form, setForm] = useState({
    name: listing.name,
    description: listing.description ?? '',
    icon: listing.icon ?? '',
    tier: listing.tier ?? '',
    tags: (listing.tags ?? []).join(', '),
    repoUrl: listing.repoUrl ?? '',
    homepage: listing.homepage ?? '',
    visibility: listing.visibility,
  });
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      await api.put(`${base}/listings/${listing.listingId}`, {
        moduleId: listing.moduleId,
        name: form.name,
        description: form.description,
        icon: form.icon,
        tier: form.tier,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        repoUrl: form.repoUrl,
        homepage: form.homepage,
        visibility: form.visibility,
      });
      toast.success('Listing updated.');
      await onChanged();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to update listing.'));
    } finally { setBusy(false); }
  }, [base, listing, form, onChanged]);

  const lifecycle = useCallback(async (action: 'unpublish' | 'republish') => {
    setBusy(true);
    try {
      await api.put(`${base}/listings/${listing.listingId}`, { action });
      toast.success(action === 'unpublish' ? 'Listing unpublished.' : 'Listing republished.');
      await onChanged();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to change listing state.'));
    } finally { setBusy(false); }
  }, [base, listing, onChanged]);

  return (
    <div className="max-w-xl space-y-5">
      <div className="space-y-3 rounded-xl border border-border bg-surface-raised p-5">
        <h3 className="text-sm font-semibold text-text-primary">Listing details</h3>
        <Field label="Name"><input className={inputCls} value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></Field>
        <Field label="Description"><textarea className={inputCls} rows={3} value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Icon (FontAwesome or URL)"><input className={inputCls} value={form.icon}
            onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value }))} /></Field>
          <Field label="Tier"><input className={inputCls} value={form.tier}
            onChange={(e) => setForm((s) => ({ ...s, tier: e.target.value }))} /></Field>
        </div>
        <Field label="Tags (comma-separated)"><input className={inputCls} value={form.tags}
          onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} /></Field>
        <Field label="Repository URL"><input className={inputCls} value={form.repoUrl}
          onChange={(e) => setForm((s) => ({ ...s, repoUrl: e.target.value }))} /></Field>
        <Field label="Homepage"><input className={inputCls} value={form.homepage}
          onChange={(e) => setForm((s) => ({ ...s, homepage: e.target.value }))} /></Field>
        <Field label="Visibility">
          <select className={inputCls} value={form.visibility}
            onChange={(e) => setForm((s) => ({ ...s, visibility: e.target.value as 'public' | 'private' }))}>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </Field>
        <Button variant="primary" loading={busy} onClick={save}>Save changes</Button>
      </div>

      <div className="space-y-3 rounded-xl border border-error/40 bg-error-subtle/30 p-5">
        <h3 className="text-sm font-semibold text-error-fg">Danger zone</h3>
        {listing.status === 'published' ? (
          <>
            <p className="text-xs text-text-secondary">Take this listing offline. Existing installs keep working; new installs are blocked.</p>
            <Button variant="danger" loading={busy} onClick={() => lifecycle('unpublish')}>Unpublish</Button>
          </>
        ) : listing.status === 'unpublished' ? (
          <>
            <p className="text-xs text-text-secondary">Bring this listing back online using its current approved version.</p>
            <Button variant="primary" loading={busy} onClick={() => lifecycle('republish')}>Republish</Button>
          </>
        ) : (
          <p className="text-xs text-text-tertiary">Lifecycle actions become available once the listing is published.</p>
        )}
      </div>
    </div>
  );
}

// ── Submit version ──
function SubmitVersionLauncher({
  detail, base, onSubmitted, busy, setBusy,
}: {
  detail: ListingDetail; base: string; onSubmitted: () => Promise<void>; busy: boolean; setBusy: (b: boolean) => void;
}) {
  const { listing, versions } = detail;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ version: '', manifestJson: '', readmeMd: '', changelog: '', packageRef: '', bundleBase64: '' });
  const [bundleName, setBundleName] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const latestVersion = versions[0]?.version;

  const manifestPreview = useMemo(() => {
    if (!form.manifestJson.trim()) return null;
    try {
      const m = JSON.parse(form.manifestJson) as { id?: string; name?: string; version?: string };
      return { ok: true as const, text: `${m.id ?? '?'} · ${m.name ?? '?'} · v${m.version ?? '?'}` };
    } catch (e) {
      return { ok: false as const, text: (e as Error).message };
    }
  }, [form.manifestJson]);

  const versionError = useMemo(() => {
    if (!form.version) return '';
    if (!CLIENT_SEMVER_RE.test(form.version.trim())) return 'Must be semver x.y.z (optional -prerelease).';
    return '';
  }, [form.version]);

  const canSubmit = !!form.version && !!form.manifestJson && !versionError && manifestPreview?.ok !== false;

  const onPickScreenshots = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        const res = await api.post(`${base}/assets`, { base64, filename: file.name, contentType: file.type });
        if (res.data?.asset?.url) setScreenshots((s) => [...s, res.data.asset.url]);
      }
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to upload screenshot.'));
    } finally { setUploading(false); }
  }, [base]);

  const submit = useCallback(async () => {
    setBusy(true);
    try {
      await api.post(`${base}/listings/${listing.listingId}/versions`, { ...form, screenshots });
      toast.success('Version submitted for review.');
      setOpen(false);
      setForm({ version: '', manifestJson: '', readmeMd: '', changelog: '', packageRef: '', bundleBase64: '' });
      setBundleName('');
      setScreenshots([]);
      await onSubmitted();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to submit version.'));
    } finally { setBusy(false); }
  }, [base, listing, form, screenshots, onSubmitted, setBusy]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-base px-4 py-3">
        <p className="text-sm text-text-secondary">
          {latestVersion
            ? <>Latest submitted version: <span className="font-mono">v{latestVersion}</span>. New versions must be higher.</>
            : 'No versions submitted yet. Submit your first version for review.'}
        </p>
        <Button variant="primary" size="sm" iconLeft={<FontAwesomeIcon icon={faUpload} aria-hidden />} onClick={() => setOpen(true)}>
          Submit version
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Submit version — ${listing.name}`}
        description="The manifest is validated against the module schema. Submitting sends it for review."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!canSubmit} onClick={submit}>Submit for review</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Version (semver)" error={versionError}
            hint={latestVersion ? `Must be greater than v${latestVersion}` : 'e.g. 1.0.0'}>
            <input className={inputCls} placeholder="1.0.0" value={form.version}
              onChange={(e) => setForm((s) => ({ ...s, version: e.target.value }))} />
          </Field>
          <Field label="module.json"
            error={manifestPreview && !manifestPreview.ok ? manifestPreview.text : undefined}
            hint={manifestPreview?.ok ? `✓ ${manifestPreview.text}` : 'Paste the full module manifest JSON.'}>
            <textarea className={`${inputCls} font-mono`} rows={7}
              placeholder='{ "id": "crm", "name": "CRM", "version": "1.0.0" }'
              value={form.manifestJson} onChange={(e) => setForm((s) => ({ ...s, manifestJson: e.target.value }))} />
          </Field>
          <Field label="Changelog"><textarea className={inputCls} rows={2} placeholder="What changed in this version?"
            value={form.changelog} onChange={(e) => setForm((s) => ({ ...s, changelog: e.target.value }))} /></Field>
          <Field label="README (markdown)"><textarea className={inputCls} rows={4} value={form.readmeMd}
            onChange={(e) => setForm((s) => ({ ...s, readmeMd: e.target.value }))} /></Field>
          <Field label="Screenshots">
            <input type="file" accept="image/*" multiple className={inputCls}
              onChange={(e) => onPickScreenshots(e.target.files)} />
            {uploading && <span className="mt-1 block text-xs text-text-tertiary">Uploading…</span>}
            {screenshots.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {screenshots.map((url, i) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-16 w-24 rounded border border-border object-cover" />
                    <button type="button" aria-label="Remove screenshot"
                      onClick={() => setScreenshots((s) => s.filter((_, j) => j !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-text-inverse text-[10px]">
                      <FontAwesomeIcon icon={faTrash} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
          <Field label="Package reference (npm name or git url#ref)"><input className={inputCls} value={form.packageRef}
            onChange={(e) => setForm((s) => ({ ...s, packageRef: e.target.value }))} /></Field>
          <Field label="Runnable bundle (single .js, IIFE assigning globalThis.__plugin)">
            <input type="file" accept=".js,.mjs,text/javascript,application/javascript" className={inputCls}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) { setForm((s) => ({ ...s, bundleBase64: '' })); setBundleName(''); return; }
                const b64 = await fileToBase64(file);
                setForm((s) => ({ ...s, bundleBase64: b64 }));
                setBundleName(file.name);
              }} />
            {bundleName && <span className="mt-1 block text-xs text-text-tertiary">{bundleName}</span>}
          </Field>
        </div>
      </Modal>
    </>
  );
}

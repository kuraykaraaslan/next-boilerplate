'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { EmptyState } from '@kuraykaraaslan/common/ui/empty-state.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode, faRocket, faShieldHalved, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import {
  type Publisher,
  type Listing,
  extractMessage,
  inputCls,
  Field,
  StatusPill,
  LifecycleLegend,
  StatCard,
  CLIENT_SLUG_RE,
  CLIENT_RESERVED_SLUGS,
  formatDate,
} from './developer-shared.component';

export function DeveloperPage({ tenantId }: { tenantId: string }) {
  const base = `/tenant/${tenantId}/api/marketplace`;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(false);

  const [apply, setApply] = useState({ slug: '', displayName: '', contact: '', website: '' });
  const [newListing, setNewListing] = useState({ moduleId: '', name: '', description: '', visibility: 'private' });
  const [showListingModal, setShowListingModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const pub = await api.get(`${base}/publisher`);
      setPublisher(pub.data.publisher);
      if (pub.data.publisher?.status === 'verified') {
        const ls = await api.get(`${base}/listings`);
        setListings(ls.data.listings ?? []);
      }
    } catch (err) {
      setError(extractMessage(err, 'Failed to load developer dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { load(); }, [load]);

  // ── Publisher application validation ──
  const slugError = useMemo(() => {
    const s = apply.slug.trim().toLowerCase();
    if (!s) return '';
    if (!CLIENT_SLUG_RE.test(s)) return 'Lowercase letters, digits and hyphens; must start with a letter.';
    if (CLIENT_RESERVED_SLUGS.has(s)) return `"${s}" is reserved.`;
    return '';
  }, [apply.slug]);

  const canApply = !!apply.slug && !!apply.displayName && !slugError;

  const submitApply = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.post(`${base}/publisher`, apply);
      setPublisher(res.data.publisher);
      toast.success('Publisher application submitted — pending review.');
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to apply.'));
    } finally { setBusy(false); }
  }, [apply, base]);

  // ── New listing ──
  const moduleIdError = useMemo(() => {
    const m = newListing.moduleId.trim().toLowerCase();
    if (!m) return '';
    if (!/^[a-z][a-z0-9_]*$/.test(m)) return 'Lowercase letters, digits and underscores; must start with a letter.';
    return '';
  }, [newListing.moduleId]);

  const saveListing = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.post(`${base}/listings`, newListing);
      setListings(res.data.listings ?? []);
      setShowListingModal(false);
      setNewListing({ moduleId: '', name: '', description: '', visibility: 'private' });
      toast.success('Listing created as a draft.');
      if (res.data.listing?.listingId) {
        router.push(`/tenant/${tenantId}/admin/developer/${res.data.listing.listingId}`);
      }
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to save listing.'));
    } finally { setBusy(false); }
  }, [newListing, base, router, tenantId]);

  const stats = useMemo(() => ({
    total: listings.length,
    published: listings.filter((l) => l.status === 'published').length,
    inReview: listings.filter((l) => l.status === 'in_review').length,
    drafts: listings.filter((l) => l.status === 'draft').length,
  }), [listings]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  // ── Not yet a publisher → onboarding ──
  if (!publisher) {
    return (
      <div className="space-y-6">
        <PageHeader title="Become a publisher" subtitle="Publish and distribute your modules on the marketplace" />
        {error && <AlertBanner variant="error" message={error} dismissible />}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Publishing gives your modules a verified namespace and an approval-gated path into every
              tenant's marketplace. Applications are reviewed before approval.
            </p>
            <ul className="space-y-3">
              {[
                { icon: faCode, title: 'Your own namespace', body: 'Everything you publish lives under an @your-slug/* scope.' },
                { icon: faShieldHalved, title: 'Reviewed & signed', body: 'Each version is reviewed and its capabilities approved before going live.' },
                { icon: faRocket, title: 'Versioned releases', body: 'Ship semver releases with changelogs, screenshots and a README.' },
              ].map((b) => (
                <li key={b.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                    <FontAwesomeIcon icon={b.icon} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{b.title}</span>
                    <span className="block text-xs text-text-secondary">{b.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-surface-raised p-5">
            <Field label="Publisher slug (namespace)" error={slugError}
              hint={apply.slug ? undefined : 'e.g. acme — used in @acme/your-module'}>
              <input className={inputCls} placeholder="acme" value={apply.slug}
                onChange={(e) => setApply((s) => ({ ...s, slug: e.target.value }))} />
            </Field>
            {apply.slug && !slugError && (
              <p className="-mt-2 text-xs text-text-tertiary">
                Your modules will publish as <code className="text-text-secondary">@{apply.slug.trim().toLowerCase()}/…</code>
              </p>
            )}
            <Field label="Display name">
              <input className={inputCls} placeholder="ACME Inc." value={apply.displayName}
                onChange={(e) => setApply((s) => ({ ...s, displayName: e.target.value }))} />
            </Field>
            <Field label="Contact email" hint="Where the review team can reach you.">
              <input className={inputCls} type="email" value={apply.contact}
                onChange={(e) => setApply((s) => ({ ...s, contact: e.target.value }))} />
            </Field>
            <Field label="Website">
              <input className={inputCls} placeholder="https://" value={apply.website}
                onChange={(e) => setApply((s) => ({ ...s, website: e.target.value }))} />
            </Field>
            <Button variant="primary" loading={busy} disabled={!canApply} onClick={submitApply}>
              Apply to publish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending / suspended ──
  if (publisher.status !== 'verified') {
    return (
      <div className="space-y-6">
        <PageHeader title="Developer" subtitle={`Publisher @${publisher.slug}`} />
        <AlertBanner
          variant={publisher.status === 'suspended' ? 'error' : 'info'}
          message={
            publisher.status === 'pending'
              ? `Your publisher application for "@${publisher.slug}" is pending verification. You'll be able to create listings once it's approved.`
              : `Publisher "@${publisher.slug}" is suspended. Contact the platform to restore publishing.`
          }
        />
      </div>
    );
  }

  // ── Verified → dashboard ──
  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer"
        subtitle={`Publishing as @${publisher.slug}`}
        actions={[{ label: 'New listing', onClick: () => setShowListingModal(true), variant: 'primary' }]}
      />
      {error && <AlertBanner variant="error" message={error} dismissible />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Listings" value={stats.total} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="In review" value={stats.inReview} />
        <StatCard label="Drafts" value={stats.drafts} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-text-primary">Your listings</h2>
        <LifecycleLegend />
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={<FontAwesomeIcon icon={faCode} aria-hidden />}
          title="No listings yet"
          description="Create your first listing, then submit a version for review."
          action={<Button variant="primary" size="sm" onClick={() => setShowListingModal(true)}>New listing</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-base text-left text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-2.5 font-medium">Listing</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Visibility</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((l) => (
                <tr
                  key={l.listingId}
                  className="cursor-pointer bg-surface-raised hover:bg-surface-overlay"
                  onClick={() => router.push(`/tenant/${tenantId}/admin/developer/${l.listingId}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{l.name}</div>
                    <code className="text-xs text-text-tertiary">{l.scopedName}</code>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={l.status} size="sm" /></td>
                  <td className="px-4 py-3 text-text-secondary capitalize">{l.visibility}</td>
                  <td className="px-4 py-3 text-text-tertiary">{formatDate(l.updatedAt)}</td>
                  <td className="px-4 py-3 text-right text-text-tertiary">
                    <FontAwesomeIcon icon={faChevronRight} aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New listing modal */}
      <Modal
        open={showListingModal}
        onClose={() => setShowListingModal(false)}
        title="New listing"
        description="Reserve a module id under your namespace. You'll add details and submit a version next."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowListingModal(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!newListing.moduleId || !newListing.name || !!moduleIdError} onClick={saveListing}>
              Create draft
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Module id" error={moduleIdError}
            hint={newListing.moduleId && !moduleIdError ? `Publishes as @${publisher.slug}/${newListing.moduleId.trim().toLowerCase()}` : 'Lowercase, e.g. crm'}>
            <input className={inputCls} placeholder="crm" value={newListing.moduleId}
              onChange={(e) => setNewListing((s) => ({ ...s, moduleId: e.target.value }))} />
          </Field>
          <Field label="Name">
            <input className={inputCls} placeholder="CRM" value={newListing.name}
              onChange={(e) => setNewListing((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={newListing.description}
              onChange={(e) => setNewListing((s) => ({ ...s, description: e.target.value }))} />
          </Field>
          <Field label="Visibility" hint="Private listings are only installable by you; public ones appear in the community catalog once published.">
            <select className={inputCls} value={newListing.visibility}
              onChange={(e) => setNewListing((s) => ({ ...s, visibility: e.target.value }))}>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

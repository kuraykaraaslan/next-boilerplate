'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';

interface Publisher {
  publisherId: string;
  slug: string;
  displayName: string;
  status: 'pending' | 'verified' | 'suspended';
}
interface Listing {
  listingId: string;
  scopedName: string;
  name: string;
  moduleId: string;
  status: string;
  visibility: string;
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const inputCls =
  'w-full rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

export function DeveloperPage({ tenantId }: { tenantId: string }) {
  const base = `/tenant/${tenantId}/api/marketplace`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(false);

  // forms
  const [apply, setApply] = useState({ slug: '', displayName: '', contact: '', website: '' });
  const [newListing, setNewListing] = useState({ moduleId: '', name: '', description: '', visibility: 'private' });
  const [showListingModal, setShowListingModal] = useState(false);
  const [versionFor, setVersionFor] = useState<Listing | null>(null);
  const [version, setVersion] = useState({ version: '1.0.0', manifestJson: '', readmeMd: '', packageRef: '' });

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

  const saveListing = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.post(`${base}/listings`, newListing);
      setListings(res.data.listings ?? []);
      setShowListingModal(false);
      setNewListing({ moduleId: '', name: '', description: '', visibility: 'private' });
      toast.success('Listing saved as draft.');
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to save listing.'));
    } finally { setBusy(false); }
  }, [newListing, base]);

  const submitVersion = useCallback(async () => {
    if (!versionFor) return;
    setBusy(true);
    try {
      await api.post(`${base}/listings/${versionFor.listingId}/versions`, version);
      setVersionFor(null);
      setVersion({ version: '1.0.0', manifestJson: '', readmeMd: '', packageRef: '' });
      toast.success('Version submitted for review.');
      await load();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to submit version.'));
    } finally { setBusy(false); }
  }, [versionFor, version, base, load]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Developer" subtitle="Publish your modules to the marketplace" />
      {error && <AlertBanner variant="error" message={error} dismissible />}

      {/* No publisher yet → application form */}
      {!publisher && (
        <div className="max-w-lg space-y-4 rounded-xl border border-border bg-surface-raised p-5">
          <p className="text-sm text-text-secondary">
            Become a verified publisher to list your modules. Applications are reviewed before approval.
          </p>
          <Field label="Publisher slug (namespace)">
            <input className={inputCls} placeholder="acme" value={apply.slug}
              onChange={(e) => setApply((s) => ({ ...s, slug: e.target.value }))} />
          </Field>
          <Field label="Display name">
            <input className={inputCls} placeholder="ACME Inc." value={apply.displayName}
              onChange={(e) => setApply((s) => ({ ...s, displayName: e.target.value }))} />
          </Field>
          <Field label="Contact email">
            <input className={inputCls} value={apply.contact}
              onChange={(e) => setApply((s) => ({ ...s, contact: e.target.value }))} />
          </Field>
          <Field label="Website">
            <input className={inputCls} value={apply.website}
              onChange={(e) => setApply((s) => ({ ...s, website: e.target.value }))} />
          </Field>
          <Button variant="primary" loading={busy} disabled={!apply.slug || !apply.displayName} onClick={submitApply}>
            Apply to publish
          </Button>
        </div>
      )}

      {publisher && publisher.status !== 'verified' && (
        <AlertBanner
          variant={publisher.status === 'suspended' ? 'error' : 'info'}
          message={
            publisher.status === 'pending'
              ? `Publisher "@${publisher.slug}" is pending verification by the platform.`
              : `Publisher "@${publisher.slug}" is suspended. Contact the platform.`
          }
        />
      )}

      {/* Verified publisher → listings */}
      {publisher && publisher.status === 'verified' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              Listings for <code>@{publisher.slug}</code>
            </h2>
            <Button variant="primary" size="sm" onClick={() => setShowListingModal(true)}>New listing</Button>
          </div>
          {listings.length === 0 ? (
            <p className="text-sm text-text-tertiary">No listings yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {listings.map((l) => (
                <div key={l.listingId} className="rounded-xl border border-border bg-surface-raised p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-primary">{l.name}</span>
                    <Badge variant={l.status === 'published' ? 'success' : l.status === 'rejected' ? 'error' : 'neutral'} size="sm">
                      {l.status}
                    </Badge>
                  </div>
                  <code className="text-xs text-text-tertiary">{l.scopedName}</code>
                  <div className="mt-3">
                    <Button variant="secondary" size="sm" onClick={() => setVersionFor(l)}>Submit version</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New listing modal */}
      <Modal
        open={showListingModal}
        onClose={() => setShowListingModal(false)}
        title="New listing"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowListingModal(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!newListing.moduleId || !newListing.name} onClick={saveListing}>
              Save draft
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Module id"><input className={inputCls} placeholder="crm" value={newListing.moduleId}
            onChange={(e) => setNewListing((s) => ({ ...s, moduleId: e.target.value }))} /></Field>
          <Field label="Name"><input className={inputCls} value={newListing.name}
            onChange={(e) => setNewListing((s) => ({ ...s, name: e.target.value }))} /></Field>
          <Field label="Description"><textarea className={inputCls} rows={2} value={newListing.description}
            onChange={(e) => setNewListing((s) => ({ ...s, description: e.target.value }))} /></Field>
          <Field label="Visibility">
            <select className={inputCls} value={newListing.visibility}
              onChange={(e) => setNewListing((s) => ({ ...s, visibility: e.target.value }))}>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </Field>
        </div>
      </Modal>

      {/* Submit version modal */}
      <Modal
        open={!!versionFor}
        onClose={() => setVersionFor(null)}
        title={versionFor ? `Submit version — ${versionFor.name}` : ''}
        description="The manifest is validated against the module schema. Submitting sends it for review."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setVersionFor(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!version.version || !version.manifestJson} onClick={submitVersion}>
              Submit for review
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Version (semver)"><input className={inputCls} placeholder="1.0.0" value={version.version}
            onChange={(e) => setVersion((s) => ({ ...s, version: e.target.value }))} /></Field>
          <Field label="module.json"><textarea className={`${inputCls} font-mono`} rows={8}
            placeholder='{ "id": "crm", "name": "CRM", "version": "1.0.0" }'
            value={version.manifestJson} onChange={(e) => setVersion((s) => ({ ...s, manifestJson: e.target.value }))} /></Field>
          <Field label="README (markdown)"><textarea className={inputCls} rows={4} value={version.readmeMd}
            onChange={(e) => setVersion((s) => ({ ...s, readmeMd: e.target.value }))} /></Field>
          <Field label="Package reference (npm name or git url#ref)"><input className={inputCls} value={version.packageRef}
            onChange={(e) => setVersion((s) => ({ ...s, packageRef: e.target.value }))} /></Field>
        </div>
      </Modal>
    </div>
  );
}

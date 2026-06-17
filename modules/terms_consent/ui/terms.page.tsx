'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import api from '@kuraykaraaslan/common/server/axios';

type Agreement = {
  agreementId: string;
  type: string;
  key: string;
  title: string;
  isActive: boolean;
  requiresAcceptance: boolean;
};
type Version = {
  versionId: string;
  version: number;
  status: string;
  isCurrent: boolean;
  language: string;
  contentHash: string;
  content: string;
  createdAt: string;
};
type Acceptance = {
  acceptanceId: string;
  agreementType: string;
  subjectUserId: string | null;
  subjectAnonymousId: string | null;
  versionLabel: string | null;
  orderRef: string | null;
  contentHash: string;
  createdAt: string;
};

const TYPE_OPTIONS = [
  { value: 'terms_of_use', label: 'Terms of use' },
  { value: 'privacy_policy', label: 'Privacy policy' },
  { value: 'kvkk', label: 'KVKK' },
  { value: 'cookie', label: 'Cookie policy' },
  { value: 'distance_selling', label: 'Distance selling (order)' },
  { value: 'pre_information', label: 'Pre-information (order)' },
  { value: 'refund_policy', label: 'Refund policy' },
  { value: 'custom', label: 'Custom' },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function TermsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const base = `/tenant/${tenantId}/api/agreements`;

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Create agreement
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState('terms_of_use');
  const [newKey, setNewKey] = useState('');
  const [newTitle, setNewTitle] = useState('');

  // Versions modal
  const [versionsOf, setVersionsOf] = useState<Agreement | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [draftContent, setDraftContent] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, acc] = await Promise.all([
        api.get(base),
        api.get(`${base}/acceptances`, { params: { pageSize: 100 } }),
      ]);
      setAgreements(a.data.data ?? []);
      setAcceptances(acc.data.data ?? []);
    } catch (err: unknown) {
      setError(extractMessage(err, 'Failed to load agreements.'));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function createAgreement() {
    setBusy(true);
    try {
      await api.post(base, { type: newType, key: newKey, title: newTitle });
      toast.success('Agreement created.');
      setCreateOpen(false);
      setNewKey('');
      setNewTitle('');
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to create the agreement.'));
    } finally {
      setBusy(false);
    }
  }

  const openVersions = useCallback(async (agreement: Agreement) => {
    setVersionsOf(agreement);
    setVersions([]);
    setDraftContent('');
    setVersionsLoading(true);
    try {
      const res = await api.get(`${base}/${agreement.agreementId}/versions`);
      setVersions(res.data.data ?? []);
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to load versions.'));
    } finally {
      setVersionsLoading(false);
    }
  }, [base]);

  async function createDraft() {
    if (!versionsOf || !draftContent.trim()) return;
    setBusy(true);
    try {
      await api.post(`${base}/${versionsOf.agreementId}/versions`, { content: draftContent });
      toast.success('Draft version created.');
      setDraftContent('');
      openVersions(versionsOf);
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to create the draft.'));
    } finally {
      setBusy(false);
    }
  }

  async function publish(v: Version) {
    if (!versionsOf) return;
    setBusy(true);
    try {
      await api.post(`${base}/${versionsOf.agreementId}/versions/${v.versionId}/publish`);
      toast.success(`Version ${v.version} published.`);
      openVersions(versionsOf);
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to publish.'));
    } finally {
      setBusy(false);
    }
  }

  const isOrderType = newType === 'distance_selling' || newType === 'pre_information';

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Agreements"
        subtitle="Versioned legal agreements (terms, privacy/KVKK, distance-selling, …) with immutable, hash-stamped versions and an acceptance ledger."
        actions={[
          { label: 'Refresh', variant: 'outline', onClick: fetchData },
          { label: 'New agreement', variant: 'primary', onClick: () => setCreateOpen(true) },
        ]}
      />

      {error && <AlertBanner variant="error" message={error} />}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-overlay text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Title</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Key</th>
              <th className="px-3 py-2 text-left font-medium">Active</th>
              <th className="px-3 py-2 text-right font-medium">Versions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-text-secondary">Loading…</td></tr>
            ) : agreements.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-text-secondary">No agreements yet.</td></tr>
            ) : (
              agreements.map((a) => (
                <tr key={a.agreementId} className="border-t border-border">
                  <td className="px-3 py-2 text-text-primary">{a.title}</td>
                  <td className="px-3 py-2"><Badge variant="info" size="sm">{a.type}</Badge></td>
                  <td className="px-3 py-2 font-mono text-xs text-text-secondary">{a.key}</td>
                  <td className="px-3 py-2"><Badge variant={a.isActive ? 'success' : 'neutral'}>{a.isActive ? 'yes' : 'no'}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openVersions(a)}>Manage</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="pt-2 text-sm font-medium text-text-primary">Acceptance ledger</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-overlay text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Subject</th>
              <th className="px-3 py-2 text-left font-medium">Version</th>
              <th className="px-3 py-2 text-left font-medium">Order</th>
              <th className="px-3 py-2 text-left font-medium">Hash</th>
              <th className="px-3 py-2 text-left font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {acceptances.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-text-secondary">No acceptances yet.</td></tr>
            ) : (
              acceptances.map((r) => (
                <tr key={r.acceptanceId} className="border-t border-border">
                  <td className="px-3 py-2 text-text-primary">{r.agreementType}</td>
                  <td className="px-3 py-2 font-mono text-xs text-text-secondary">{r.subjectUserId ?? r.subjectAnonymousId ?? '—'}</td>
                  <td className="px-3 py-2 text-text-secondary">{r.versionLabel ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-text-secondary">{r.orderRef ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-text-secondary" title={r.contentHash}>{r.contentHash.slice(0, 12)}…</td>
                  <td className="px-3 py-2 text-text-secondary">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create agreement modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New agreement">
        <div className="space-y-3">
          <Select id="ag-type" label="Type" value={newType} onChange={(e) => setNewType(e.target.value)} options={TYPE_OPTIONS} />
          {isOrderType && (
            <AlertBanner
              variant="info"
              message="Order-specific type: the version content is a template. Use {{order.total}}, {{order.items}}, {{buyer.name}}, {{seller.name}} etc. — rendered per order at checkout."
            />
          )}
          <Input id="ag-key" label="Key" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="distance-selling" />
          <Input id="ag-title" label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Distance Selling Agreement" />
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={createAgreement} disabled={busy || !newKey || !newTitle}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Versions modal */}
      <Modal open={!!versionsOf} onClose={() => setVersionsOf(null)} title={versionsOf ? `${versionsOf.title} — versions` : 'Versions'}>
        <div className="space-y-4">
          {versionsLoading ? (
            <div className="px-3 py-6 text-center text-text-secondary">Loading…</div>
          ) : (
            <div className="space-y-2">
              {versions.length === 0 && <p className="text-sm text-text-secondary">No versions yet — create the first draft below.</p>}
              {versions.map((v) => (
                <div key={v.versionId} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <span className="font-medium text-text-primary">v{v.version}</span>
                  <Badge variant={v.status === 'published' ? 'success' : v.status === 'draft' ? 'warning' : 'neutral'} size="sm">{v.status}</Badge>
                  {v.isCurrent && <Badge variant="primary" size="sm">current</Badge>}
                  <span className="font-mono text-xs text-text-secondary" title={v.contentHash}>{v.contentHash.slice(0, 10)}…</span>
                  <span className="ml-auto">
                    {v.status === 'draft' && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => publish(v)}>Publish</Button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <label htmlFor="draft-content" className="block text-sm font-medium text-text-primary">New draft content</label>
            <textarea
              id="draft-content"
              className="h-40 w-full rounded-md border border-border bg-surface-sunken p-2 font-mono text-xs text-text-primary"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Full agreement text. For order types, use {{placeholders}}."
            />
            <div className="flex justify-end">
              <Button variant="primary" disabled={busy || !draftContent.trim()} onClick={createDraft}>Create draft</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

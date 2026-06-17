'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';

interface Publisher { publisherId: string; slug: string; displayName: string; status: string; contact: string | null; }
interface QueueItem {
  version: { versionId: string; version: string; manifestJson: string; readmeMd: string | null; packageRef: string | null; submittedAt: string };
  listing: { listingId: string; scopedName: string; name: string };
  publisher: Publisher | null;
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/** Parse the requested sandbox grant (capabilities + http allowlist) from a manifest. */
function sandboxOf(manifestJson: string): { runtime?: string; capabilities: string[]; httpAllowlist: string[] } {
  try {
    const m = JSON.parse(manifestJson) as { sandbox?: { runtime?: string; capabilities?: string[]; httpAllowlist?: string[] } };
    return { runtime: m.sandbox?.runtime, capabilities: m.sandbox?.capabilities ?? [], httpAllowlist: m.sandbox?.httpAllowlist ?? [] };
  } catch { return { capabilities: [], httpAllowlist: [] }; }
}

export function ReviewPage({ tenantId }: { tenantId: string }) {
  const base = `/tenant/${tenantId}/api/marketplace`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pendingPublishers, setPendingPublishers] = useState<Publisher[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${base}/review`);
      setQueue(res.data.queue ?? []);
      setPendingPublishers(res.data.pendingPublishers ?? []);
    } catch (err) {
      setError(extractMessage(err, 'Failed to load review queue.'));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { load(); }, [load]);

  const setPublisher = useCallback(async (p: Publisher, status: 'verified' | 'suspended') => {
    setBusy(p.publisherId);
    try {
      await api.put(`${base}/publishers/${p.publisherId}`, { status });
      toast.success(`@${p.slug} ${status}`);
      await load();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed.'));
    } finally { setBusy(null); }
  }, [base, load]);

  const review = useCallback(async (item: QueueItem, decision: 'approve' | 'reject') => {
    setBusy(item.version.versionId);
    try {
      await api.put(`${base}/review/${item.version.versionId}`, { decision, notes: notes[item.version.versionId] });
      toast.success(`${item.listing.scopedName} ${decision}d`);
      await load();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to review.'));
    } finally { setBusy(null); }
  }, [base, notes, load]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-8">
      <PageHeader title="Module Review" subtitle="Approve publishers and submitted module versions" />
      {error && <AlertBanner variant="error" message={error} dismissible />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Publisher applications ({pendingPublishers.length})
        </h2>
        {pendingPublishers.length === 0 ? (
          <p className="text-sm text-text-tertiary">No pending applications.</p>
        ) : pendingPublishers.map((p) => (
          <div key={p.publisherId} className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4">
            <div>
              <div className="font-medium text-text-primary">{p.displayName} <code className="text-xs text-text-tertiary">@{p.slug}</code></div>
              {p.contact && <div className="text-xs text-text-secondary">{p.contact}</div>}
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" loading={busy === p.publisherId} onClick={() => setPublisher(p, 'verified')}>Verify</Button>
              <Button variant="danger" size="sm" disabled={busy === p.publisherId} onClick={() => setPublisher(p, 'suspended')}>Suspend</Button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Submissions ({queue.length})
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-text-tertiary">Review queue is empty.</p>
        ) : queue.map((item) => (
          <div key={item.version.versionId} className="space-y-3 rounded-xl border border-border bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-text-primary">{item.listing.name}</span>{' '}
                <code className="text-xs text-text-tertiary">{item.listing.scopedName}</code>
                <Badge variant="neutral" size="sm">v{item.version.version}</Badge>
              </div>
              <span className="text-xs text-text-tertiary">
                by @{item.publisher?.slug ?? '?'} · {new Date(item.version.submittedAt).toLocaleDateString()}
              </span>
            </div>
            {(() => {
              const sb = sandboxOf(item.version.manifestJson);
              return (
                <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
                  <span className="font-medium text-text-primary">Requested capabilities</span>{' '}
                  {sb.runtime === 'isolated'
                    ? (sb.capabilities.length
                        ? sb.capabilities.map((c) => <Badge key={c} variant="warning" size="sm">{c}</Badge>)
                        : <span className="text-text-tertiary">none</span>)
                    : <span className="text-text-tertiary">not a sandboxed plugin</span>}
                  {sb.httpAllowlist.length > 0 && (
                    <div className="mt-1 text-text-secondary">http allowlist: {sb.httpAllowlist.join(', ')}</div>
                  )}
                  <div className="mt-1 text-text-tertiary">Approving grants these to the plugin for every installing tenant.</div>
                </div>
              );
            })()}
            <details className="text-xs">
              <summary className="cursor-pointer text-text-secondary">View manifest</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-surface-sunken p-3 text-text-primary">{item.version.manifestJson}</pre>
            </details>
            {item.version.packageRef && (
              <p className="text-xs text-text-secondary">Package: <code>{item.version.packageRef}</code></p>
            )}
            <textarea
              className="w-full rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-text-primary"
              rows={2}
              placeholder="Review notes (shown to publisher on reject)"
              value={notes[item.version.versionId] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [item.version.versionId]: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" loading={busy === item.version.versionId} onClick={() => review(item, 'approve')}>Approve & publish</Button>
              <Button variant="danger" size="sm" disabled={busy === item.version.versionId} onClick={() => review(item, 'reject')}>Reject</Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

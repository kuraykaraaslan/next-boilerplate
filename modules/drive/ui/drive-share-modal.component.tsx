'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import type { DriveNode, DriveRole, ShareView, PublicLinkView } from '@kuraykaraaslan/drive/ui/drive.types';
import { extractMessage } from '@kuraykaraaslan/drive/ui/drive.types';

/** Manage internal (user) shares and a public "anyone with the link" link. */
export function DriveShareModal({
  apiBase,
  origin,
  node,
  onClose,
}: {
  apiBase: string;
  origin: string;
  node: DriveNode | null;
  onClose: () => void;
}) {
  const [shares, setShares] = useState<ShareView[]>([]);
  const [links, setLinks] = useState<PublicLinkView[]>([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<DriveRole>('viewer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!node) return;
    setError('');
    try {
      const [s, l] = await Promise.all([
        api.get(`${apiBase}/${node.driveFileId}/shares`),
        node.type === 'file' ? api.get(`${apiBase}/${node.driveFileId}/public-link`) : Promise.resolve({ data: { links: [] } }),
      ]);
      setShares(s.data.shares ?? []);
      setLinks(l.data.links ?? []);
    } catch (err) {
      setError(extractMessage(err, 'Failed to load shares.'));
    }
  }, [apiBase, node]);

  useEffect(() => {
    if (node) load();
    else {
      setShares([]);
      setLinks([]);
      setUserId('');
      setError('');
    }
  }, [node, load]);

  async function addShare() {
    if (!node || !userId) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`${apiBase}/${node.driveFileId}/shares`, { sharedWithUserId: userId, role });
      setUserId('');
      toast.success('Shared.');
      load();
    } catch (err) {
      setError(extractMessage(err, 'Failed to share.'));
    } finally {
      setBusy(false);
    }
  }

  async function removeShare(sharedWithUserId: string) {
    if (!node) return;
    await api.delete(`${apiBase}/${node.driveFileId}/shares`, { params: { sharedWithUserId } });
    toast.success('Share revoked.');
    load();
  }

  async function createLink() {
    if (!node) return;
    setBusy(true);
    try {
      await api.post(`${apiBase}/${node.driveFileId}/public-link`, { role: 'viewer' });
      toast.success('Public link created.');
      load();
    } catch (err) {
      setError(extractMessage(err, 'Failed to create link.'));
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink(linkId: string) {
    if (!node) return;
    await api.delete(`${apiBase}/${node.driveFileId}/public-link`, { params: { linkId } });
    toast.success('Link revoked.');
    load();
  }

  function publicUrl(token: string): string {
    return `${origin}${apiBase}/public/${token}`;
  }

  return (
    <Modal open={!!node} onClose={onClose} title={`Share "${node?.name ?? ''}"`} size="lg">
      <div className="space-y-5">
        {error && <AlertBanner variant="error" message={error} />}

        {/* Internal sharing */}
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-text-primary">Share with a user</h4>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input id="share-user" label="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user uuid" />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as DriveRole)}
              className="h-10 rounded-lg border border-border bg-surface-base px-2 text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
            <Button onClick={addShare} loading={busy} disabled={!userId}>
              Share
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {shares.length === 0 && <li className="px-3 py-2 text-sm text-text-secondary">Not shared with anyone yet.</li>}
            {shares.map((s) => (
              <li key={s.driveShareId} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">
                  {s.sharedWithUserId} · <span className="text-text-secondary">{s.role}</span>
                </span>
                <Button variant="ghost" onClick={() => removeShare(s.sharedWithUserId)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {/* Public link (files only) */}
        {node?.type === 'file' && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-primary">Public link</h4>
              <Button variant="secondary" onClick={createLink} loading={busy}>
                Create link
              </Button>
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {links.length === 0 && <li className="px-3 py-2 text-sm text-text-secondary">No public links.</li>}
              {links.map((l) => (
                <li key={l.drivePublicLinkId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <button
                    className="truncate text-left text-accent hover:underline"
                    onClick={() => {
                      navigator.clipboard?.writeText(publicUrl(l.token));
                      toast.success('Link copied.');
                    }}
                    title="Copy link"
                  >
                    {publicUrl(l.token)}
                  </button>
                  <Button variant="ghost" onClick={() => revokeLink(l.drivePublicLinkId)}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

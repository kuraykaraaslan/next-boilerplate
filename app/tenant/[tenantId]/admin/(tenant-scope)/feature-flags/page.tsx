'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import { buildFlagColumns, type FlagRow as Flag } from '@/modules_next/feature_flags/ui/feature-flag-columns';

const PAGE_SIZE = 25;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function FeatureFlagsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const base = `/tenant/${tenantId}/api/feature-flags`;

  const [flags, setFlags] = useState<Flag[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [busy, setBusy] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');

  // Edit modal
  const [edit, setEdit] = useState<Flag | null>(null);
  const [editName, setEditName] = useState('');
  const [editRollout, setEditRollout] = useState('0');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(base, { params: { pageSize: 200 } });
      setFlags(res.data.data ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load feature flags.'));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function createFlag() {
    setBusy(true);
    try {
      await api.post(base, { key: newKey, name: newName });
      toast.success('Flag created.');
      setCreateOpen(false);
      setNewKey('');
      setNewName('');
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to create the flag.'));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(flag: Flag) {
    setBusy(true);
    try {
      await api.patch(`${base}/${flag.key}`, { enabled: !flag.enabled });
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to toggle the flag.'));
    } finally {
      setBusy(false);
    }
  }

  function openEdit(flag: Flag) {
    setEdit(flag);
    setEditName(flag.name);
    setEditRollout(String(flag.rolloutPercentage));
  }

  async function saveEdit() {
    if (!edit) return;
    const pct = Math.max(0, Math.min(100, Number(editRollout) || 0));
    setBusy(true);
    try {
      await api.patch(`${base}/${edit.key}`, { name: editName, rolloutPercentage: pct });
      toast.success('Flag updated.');
      setEdit(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to update the flag.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(flag: Flag) {
    if (!confirm(`Delete flag "${flag.key}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(`${base}/${flag.key}`);
      toast.success('Flag deleted.');
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to delete the flag.'));
    } finally {
      setBusy(false);
    }
  }

  const total = flags.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = flags.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildFlagColumns({ onToggle: toggle, onEdit: openEdit, onRemove: remove });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Feature flags"
        subtitle="Gate features, run percentage rollouts and target by attribute."
        actions={[
          { label: 'Refresh', variant: 'outline', onClick: fetchData },
          { label: 'New flag', variant: 'primary', onClick: () => setCreateOpen(true) },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(f) => f.flagId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No feature flags yet."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New feature flag">
        <div className="space-y-3">
          <Input
            id="flag-key"
            label="Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="new-checkout"
          />
          <Input
            id="flag-name"
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New checkout"
          />
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={createFlag} disabled={busy || !newKey || !newName}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `Edit ${edit.key}` : 'Edit flag'}>
        <div className="space-y-3">
          <Input id="edit-name" label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input
            id="edit-rollout"
            label="Rollout percentage (0-100)"
            value={editRollout}
            onChange={(e) => setEditRollout(e.target.value)}
            placeholder="0"
          />
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setEdit(null)} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit} disabled={busy}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

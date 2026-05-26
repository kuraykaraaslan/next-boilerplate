'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Badge } from '@/modules_next/common/ui/Badge';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type BlockDef = {
  blockId: string;
  type: string;
  label: string;
  category: string;
  isSystem: boolean;
  createdAt: string;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function BlocksListPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [blocks, setBlocks] = useState<BlockDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: '', label: '', category: 'Custom' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchBlocks = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/dynamic-pages/block-definitions`);
      setBlocks(res.data.blocks ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load block definitions.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/dynamic-pages/block-definitions`, {
        type: form.type,
        label: form.label,
        category: form.category,
        template: '',
        defaultProps: {},
        schema: {},
      });
      toast.success('Block definition created');
      setShowCreate(false);
      setForm({ type: '', label: '', category: 'Custom' });
      router.push(`/tenant/${tenantId}/admin/blocks/${res.data.block.blockId}`);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create block.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(blockId: string, label: string) {
    if (!confirm(`Delete block "${label}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/dynamic-pages/block-definitions/${blockId}`);
      toast.success('Block deleted');
      fetchBlocks();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete block.'));
    }
  }

  const columns: TableColumn<BlockDef>[] = [
    {
      key: 'label', header: 'Block',
      render: (b) => (
        <div>
          <p className="font-medium text-text-primary">{b.label}</p>
          <p className="text-xs text-text-secondary font-mono">{b.type}</p>
        </div>
      ),
    },
    {
      key: 'category', header: 'Category',
      render: (b) => <span className="text-sm text-text-secondary">{b.category}</span>,
    },
    {
      key: 'isSystem', header: 'Type',
      render: (b) => <Badge variant={b.isSystem ? 'neutral' : 'success'}>{b.isSystem ? 'System' : 'Custom'}</Badge>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (b) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            {
              label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />,
              onClick: () => router.push(`/tenant/${tenantId}/admin/blocks/${b.blockId}`),
            },
            ...(b.isSystem ? [] : [{
              label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger' as const,
              onClick: () => handleDelete(b.blockId, b.label),
            }]),
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Block Definitions"
        subtitle="Custom block templates"
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Block</>, onClick: () => setShowCreate(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={blocks}
        getRowKey={(b) => b.blockId}
        page={1}
        totalPages={1}
        total={blocks.length}
        pageSize={blocks.length || 1}
        onPageChange={() => {}}
        onRowClick={(b) => router.push(`/tenant/${tenantId}/admin/blocks/${b.blockId}`)}
        loading={loading}
        emptyMessage="No custom block definitions yet."
      />

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm({ type: '', label: '', category: 'Custom' }); setFormError(''); }}
        title="New Block Definition"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!form.type || !form.label}>Create &amp; Edit</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="blk-label" label="Label" required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <Input
            id="blk-type" label="Type (unique identifier)" required
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            hint="Example: hero-banner, promo-card"
          />
          <Input id="blk-cat" label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

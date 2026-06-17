'use client';

import { useCallback, useEffect, useState } from 'react';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import api from '@kuraykaraaslan/common/server/axios';

type Feature = {
  featureId: string;
  key: string;
  label: string;
  type: 'BOOLEAN' | 'LIMIT';
  value: string;
  sortOrder: number;
};

type FeatureForm = { key: string; label: string; type: 'BOOLEAN' | 'LIMIT'; value: string };

const FEATURE_TYPE_OPTIONS = [
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'LIMIT',   label: 'Limit'   },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function PlanFeaturesPanel({ tenantId, planId }: { tenantId: string; planId: string }) {
  const [features, setFeatures]               = useState<Feature[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [featuresError, setFeaturesError]     = useState('');

  const [addOpen, setAddOpen]                 = useState(false);
  const [form, setForm]                       = useState<FeatureForm>({ key: '', label: '', type: 'BOOLEAN', value: 'true' });
  const [adding, setAdding]                   = useState(false);
  const [addError, setAddError]               = useState('');

  const [deleteId, setDeleteId]               = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [deleteError, setDeleteError]         = useState('');

  const fetchFeatures = useCallback(async () => {
    setLoading(true); setFeaturesError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/plans/${planId}/features`);
      setFeatures(res.data.features ?? []);
    } catch (err: unknown) {
      setFeaturesError(extractMessage(err, 'Failed to load features.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, planId]);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  function resetForm() { setForm({ key: '', label: '', type: 'BOOLEAN', value: 'true' }); setAddError(''); }

  async function handleAdd() {
    if (!form.key.trim())   { setAddError('Feature key is required.');   return; }
    if (!form.label.trim()) { setAddError('Feature label is required.'); return; }
    if (!form.value.trim()) { setAddError('Feature value is required.'); return; }
    setAdding(true); setAddError('');
    try {
      await api.post(`/tenant/${tenantId}/api/plans/${planId}/features`, {
        key: form.key.trim(), label: form.label.trim(), type: form.type, value: form.value.trim(),
      });
      setAddOpen(false); resetForm();
      toast.success('Feature added.');
      fetchFeatures();
    } catch (err: unknown) {
      setAddError(extractMessage(err, 'Failed to add feature.'));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/plans/${planId}/features/${deleteId}`);
      setDeleteId(null);
      toast.success('Feature deleted.');
      fetchFeatures();
    } catch (err: unknown) {
      setDeleteError(extractMessage(err, 'Failed to delete feature.'));
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<Feature>[] = [
    { key: 'key',   header: 'Key',   render: (f) => <span className="font-mono text-xs text-text-primary">{f.key}</span> },
    { key: 'label', header: 'Label', render: (f) => <span className="text-text-primary">{f.label}</span> },
    {
      key: 'type',
      header: 'Type',
      render: (f) => <Badge variant={f.type === 'BOOLEAN' ? 'primary' : 'neutral'}>{f.type}</Badge>,
    },
    { key: 'value', header: 'Value', render: (f) => <span className="font-mono text-xs text-text-secondary">{f.value}</span> },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (f) => (
        <RowActionsMenu actions={[{
          label: 'Delete',
          icon: <FontAwesomeIcon icon={faTrash} />,
          onClick: () => { setDeleteError(''); setDeleteId(f.featureId); },
          variant: 'danger',
        }]} />
      ),
    },
  ];

  if (featuresError) return <AlertBanner variant="error" message={featuresError} />;

  return (
    <>
      <ServerDataTable
        columns={columns}
        rows={features}
        getRowKey={(f) => f.featureId}
        page={1}
        totalPages={1}
        total={features.length}
        onPageChange={() => {}}
        loading={loading}
        emptyMessage="No features defined for this plan."
        hidePagination
        title="Features"
        headerRight={
          <Button size="sm" variant="outline" iconLeft={<FontAwesomeIcon icon={faPlus} />}
            onClick={() => { resetForm(); setAddOpen(true); }}>
            Add Feature
          </Button>
        }
      />

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); resetForm(); }}
        title="Add Feature"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAddOpen(false); resetForm(); }} disabled={adding}>Cancel</Button>
            <Button variant="primary" loading={adding} onClick={handleAdd}>Add Feature</Button>
          </>
        }
      >
        <div className="space-y-4">
          {addError && <AlertBanner variant="error" message={addError} dismissible />}
          <Input id="feature-key" label="Key" value={form.key} required hint="e.g. max_users"
            onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} />
          <Input id="feature-label" label="Label" value={form.label} required hint="Human-readable name"
            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
          <Select id="feature-type" label="Type" options={FEATURE_TYPE_OPTIONS} value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'BOOLEAN' | 'LIMIT' }))} />
          <Input id="feature-value" label="Value" value={form.value} required hint='"true" or "100"'
            onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Feature"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
      </Modal>
    </>
  );
}

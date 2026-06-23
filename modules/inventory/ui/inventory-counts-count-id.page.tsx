'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { CountStatusBadge } from '@kuraykaraaslan/inventory/ui/count-status-badge.component';
import { CountLinesPanel } from '@kuraykaraaslan/inventory/ui/count-lines-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlay, faCheck } from '@fortawesome/free-solid-svg-icons';

type Count = {
  countId: string;
  warehouseId: string;
  reference?: string | null;
  status: string;
  lineCount: number;
  totalDiff: number;
};

type Form = { warehouseId: string; reference: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function InventoryCountDetailPage({ params }: { params: Promise<{ tenantId: string; countId: string }> }) {
  const { tenantId, countId } = use(params);
  const base = `/tenant/${tenantId}/api/inventory/counts`;

  const [count, setCount] = useState<Count | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [form, setForm] = useState<Form>({ warehouseId: '', reference: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`${base}/${countId}`);
      const c: Count = res.data.item;
      setCount(c);
      setForm({ warehouseId: c.warehouseId ?? '', reference: c.reference ?? '' });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load count.'));
    } finally { setLoading(false); }
  }, [base, countId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`${base}/${countId}`, {
        warehouseId: form.warehouseId,
        reference: form.reference || undefined,
      });
      toast.success('Count saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function handleTransition(action: 'start' | 'close', label: string) {
    setTransitioning(true);
    try {
      await api.post(`${base}/${countId}/${action}`);
      toast.success(`${label} done`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${label.toLowerCase()}.`));
    } finally { setTransitioning(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!count) return null;

  const isClosed = count.status === 'CLOSED';

  const actions: { label: React.ReactNode; onClick: () => void; disabled?: boolean }[] = [];
  if (count.status === 'OPEN') {
    actions.push({ label: <><FontAwesomeIcon icon={faPlay} /> Start Count</>, onClick: () => handleTransition('start', 'Start Count'), disabled: transitioning });
  }
  if (count.status === 'IN_PROGRESS') {
    actions.push({ label: <><FontAwesomeIcon icon={faCheck} /> Validate</>, onClick: () => handleTransition('close', 'Validate'), disabled: transitioning });
  }
  if (!isClosed) {
    actions.push({ label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving });
  }

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">General</h3>
            <Input id="c-wh" label="Warehouse ID" required value={form.warehouseId} disabled={isClosed}
              onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))} />
            <Input id="c-ref" label="Reference" value={form.reference} disabled={isClosed}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Lines</span>
              <span className="tabular-nums text-text-primary">{count.lineCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Total Diff</span>
              <span className="tabular-nums text-text-primary">{count.totalDiff}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'lines', label: `Lines (${count.lineCount})`,
      content: <CountLinesPanel tenantId={tenantId} countId={countId} readOnly={isClosed} onRefresh={load} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Counts', href: `/tenant/${tenantId}/admin/inventory/counts` },
        { label: count.reference || count.countId.slice(0, 8) },
      ]} />

      <PageHeader
        title={count.reference || `Count ${count.countId.slice(0, 8)}`}
        subtitle={count.warehouseId}
        badge={<CountStatusBadge status={count.status} />}
        actions={actions}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}

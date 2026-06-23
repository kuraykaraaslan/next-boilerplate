'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { JournalEntryStatusBadge } from './journal-entry-status-badge.component';
import { JournalLinesPanel } from './journal-lines-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

type Entry = {
  entryId: string;
  number: string;
  journalId?: string | null;
  description?: string | null;
  status: string;
  entryDate?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
};
type JournalOption = { journalId: string; name: string };

type Form = { number: string; journalId: string; description: string; entryDate: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
function toDateInput(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
function num(v: unknown) { const n = Number(v ?? 0); return isNaN(n) ? 0 : n; }
function fmt(v: unknown) { return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function JournalEntryDetailPage({ params }: { params: Promise<{ tenantId: string; entryId: string }> }) {
  const { tenantId, entryId } = use(params);

  const [entry, setEntry] = useState<Entry | null>(null);
  const [journals, setJournals] = useState<JournalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [acting, setActing] = useState(false);

  const [form, setForm] = useState<Form>({ number: '', journalId: '', description: '', entryDate: '' });

  const base = `/tenant/${tenantId}/api/accounting/journal/${entryId}`;

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [entryRes, journalsRes] = await Promise.all([
        api.get(base),
        api.get(`/tenant/${tenantId}/api/accounting/journals`, { params: { pageSize: 100 } }),
      ]);
      const e: Entry = entryRes.data.item;
      setEntry(e);
      setJournals(journalsRes.data.data ?? []);
      setForm({
        number: e.number, journalId: e.journalId ?? '',
        description: e.description ?? '', entryDate: toDateInput(e.entryDate),
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load entry.'));
    } finally { setLoading(false); }
  }, [base, tenantId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(base, {
        number: form.number,
        journalId: form.journalId || undefined,
        description: form.description || undefined,
        entryDate: form.entryDate || undefined,
      });
      toast.success('Entry saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function handleTransition(action: 'post' | 'void') {
    setActing(true);
    try {
      await api.post(`${base}/${action}`);
      toast.success(action === 'post' ? 'Entry posted' : 'Entry voided');
      load();
    } catch (err) {
      toast.error(extractMessage(err, 'Transition failed.'));
    } finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!entry) return null;

  const journalOptions = journals.map((j) => ({ value: j.journalId, label: j.name }));

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Entry Details</h3>
            <Input id="e-number" label="Number" required value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
            <Select id="e-journal" label="Journal"
              options={[{ value: '', label: '— None —' }, ...journalOptions]}
              value={form.journalId} onChange={(e) => setForm((f) => ({ ...f, journalId: e.target.value }))} />
            <Input id="e-description" label="Description" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input id="e-date" label="Entry Date" type="date" value={form.entryDate}
              onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Totals</h3>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Total Debit</span><span className="tabular-nums text-text-primary">{fmt(entry.totalDebit)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Total Credit</span><span className="tabular-nums text-text-primary">{fmt(entry.totalCredit)}</span></div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-text-secondary">Balanced</span>
              <span className={num(entry.totalDebit) === num(entry.totalCredit) && num(entry.totalDebit) > 0 ? 'text-success font-medium' : 'text-error font-medium'}>
                {num(entry.totalDebit) === num(entry.totalCredit) && num(entry.totalDebit) > 0 ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    { id: 'lines', label: 'Lines', content: <JournalLinesPanel tenantId={tenantId} entryId={entryId} onRefresh={load} /> },
  ];

  const actions = [];
  if (entry.status === 'DRAFT') actions.push({ label: acting ? 'Posting…' : 'Post', onClick: () => handleTransition('post'), disabled: acting, variant: 'secondary' as const });
  if (entry.status === 'POSTED') actions.push({ label: acting ? 'Voiding…' : 'Reset to Void', onClick: () => handleTransition('void'), disabled: acting, variant: 'secondary' as const });
  actions.push({ label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Journal', href: `/tenant/${tenantId}/admin/accounting/journal` },
        { label: entry.number },
      ]} />

      <PageHeader
        title={entry.number}
        subtitle={entry.description ?? undefined}
        badge={<JournalEntryStatusBadge status={entry.status} />}
        actions={actions}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}

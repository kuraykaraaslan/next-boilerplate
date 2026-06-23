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
import { FormStatusBadge, type FormStatus } from '@kuraykaraaslan/form_builder/ui/form-status-badge.component';
import { FormFieldsPanel } from '@kuraykaraaslan/form_builder/ui/form-fields-panel.component';
import { FormSubmissionsPanel } from '@kuraykaraaslan/form_builder/ui/form-submissions-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPaperPlane, faBoxArchive } from '@fortawesome/free-solid-svg-icons';

type Form = {
  formId: string;
  title: string;
  slug: string;
  status: FormStatus;
};

type FormState = { title: string; slug: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const TRANSITIONS: { action: string; label: string; from: FormStatus[]; icon: typeof faSave }[] = [
  { action: 'publish', label: 'Publish', from: ['DRAFT', 'ARCHIVED'], icon: faPaperPlane },
  { action: 'archive', label: 'Archive', from: ['PUBLISHED', 'DRAFT'], icon: faBoxArchive },
];

export default function FormDetailPage({ params }: { params: Promise<{ tenantId: string; formId: string }> }) {
  const { tenantId, formId } = use(params);

  const [item, setItem] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [working, setWorking] = useState(false);

  const [form, setForm] = useState<FormState>({ title: '', slug: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/forms/${formId}`);
      const f: Form = res.data.item;
      setItem(f);
      setForm({ title: f.title, slug: f.slug });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load form.'));
    } finally { setLoading(false); }
  }, [tenantId, formId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/forms/${formId}`, {
        title: form.title,
        slug: form.slug,
      });
      toast.success('Form saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/forms/${formId}/${action}`);
      toast.success(`Form ${action}ed`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!item) return null;

  const availableActions = TRANSITIONS.filter((t) => t.from.includes(item.status)).map((t) => ({
    label: <><FontAwesomeIcon icon={t.icon} /> {t.label}</>,
    onClick: () => runTransition(t.action),
    disabled: working,
  }));

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">General</h3>
            <Input id="f-title" label="Title" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input id="f-slug" label="Slug" required value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <FormStatusBadge status={item.status} size="sm" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'fields', label: 'Fields',
      content: <FormFieldsPanel tenantId={tenantId} formId={formId} onRefresh={load} />,
    },
    {
      id: 'submissions', label: 'Submissions',
      content: <FormSubmissionsPanel tenantId={tenantId} formId={formId} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Forms', href: `/tenant/${tenantId}/admin/forms` },
        { label: item.title },
      ]} />

      <PageHeader
        title={item.title}
        subtitle={item.slug}
        badge={<FormStatusBadge status={item.status} />}
        actions={[
          ...availableActions,
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}

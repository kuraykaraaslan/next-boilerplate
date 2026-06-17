'use client';
// Shared host for per-module settings pages. Loads the tenant's settings once,
// renders the standard "settings theme" chrome (Breadcrumb + PageHeader + toast),
// and hands a panel `{ settings, onSave, saving }` via a render prop.
//
// `onSave` sends ONLY the patch keys to `PUT /api/admin-settings` (partial upsert)
// so saving one module's panel never clobbers another module's keys.
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import type { SR } from '@kuraykaraaslan/setting/ui/settings-kit.component';

type PanelProps = { settings: SR; onSave: (patch: SR) => Promise<void>; saving: boolean };

export function SettingsPanelHost({
  tenantId,
  title,
  subtitle,
  parentCrumb,
  children,
}: {
  tenantId: string;
  title: string;
  subtitle?: string;
  parentCrumb: { label: string; href: string };
  children: (props: PanelProps) => React.ReactNode;
}) {
  const [settings, setSettings] = useState<SR>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/admin-settings`)
      .then((res) => setSettings(res.data?.settings ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const onSave = useCallback(async (patch: SR) => {
    setSaving(true);
    setToast(null);
    try {
      await api.put(`/tenant/${tenantId}/api/admin-settings`, { settings: patch });
      setSettings((prev) => ({ ...prev, ...patch }));
      setToast({ type: 'success', msg: 'Settings saved.' });
    } catch (err: any) {
      setToast({ type: 'error', msg: err?.response?.data?.message ?? err?.message ?? 'Failed to save.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[parentCrumb, { label: title }]} />
      <PageHeader title={title} subtitle={subtitle} />
      {toast && (
        <AlertBanner
          variant={toast.type === 'success' ? 'success' : 'error'}
          message={toast.msg}
          dismissible
        />
      )}
      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : children({ settings, onSave, saving })}
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { SECRET_MASK, type SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

type ModuleSettingsPageProps = {
  tenantId: string;
  /** Page title; rendered as "<title> Settings". */
  title: string;
  subtitle?: string;
  /** Parent admin page, shown as the first breadcrumb. */
  parentCrumb: { label: string; href: string };
  fields: SettingFieldDef[];
};

/**
 * Generic, data-driven settings page shared by every module. Reads/writes the
 * tenant's settings through the existing generic endpoint
 * `/tenant/[tenantId]/api/admin-settings` (ADMIN-gated). It only ever reads and
 * patches the keys declared in `fields`, so saving one module's settings never
 * touches another module's keys.
 */
export function ModuleSettingsPage({
  tenantId,
  title,
  subtitle,
  parentCrumb,
  fields,
}: ModuleSettingsPageProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get(`/tenant/${tenantId}/api/admin-settings`)
      .then((res) => {
        if (!active) return;
        const all: Record<string, string> = res.data?.settings ?? {};
        const init: Record<string, string> = {};
        for (const f of fields) init[f.key] = all[f.key] ?? f.defaultValue ?? '';
        setValues(init);
      })
      .catch(() => {
        // New tenant / no settings yet — fall back to defaults.
        const init: Record<string, string> = {};
        for (const f of fields) init[f.key] = f.defaultValue ?? '';
        if (active) setValues(init);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenantId]); // `fields` is module-static

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup: Record<string, SettingFieldDef[]> = {};
    for (const f of fields) {
      if (!byGroup[f.group]) { byGroup[f.group] = []; order.push(f.group); }
      byGroup[f.group].push(f);
    }
    return order.map((g) => ({ group: g, items: byGroup[g] }));
  }, [fields]);

  function set(key: string, val: string) {
    setValues((p) => ({ ...p, [key]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const patch: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key] ?? '';
      // Never overwrite a real secret with the mask sentinel.
      if (f.type === 'secret' && v === SECRET_MASK) continue;
      patch[f.key] = v;
    }
    try {
      await api.put(`/tenant/${tenantId}/api/admin-settings`, { settings: patch });
      setSuccess('Settings saved.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[parentCrumb, { label: 'Settings' }]} />

      <PageHeader title={`${title} Settings`} subtitle={subtitle} />

      {error   && <AlertBanner variant="error"   message={error}   dismissible />}
      {success && <AlertBanner variant="success" message={success} dismissible />}

      <form onSubmit={handleSave} className="space-y-6">
        {groups.map(({ group, items }) => (
          <Card key={group} title={group}>
            <div className="space-y-4">
              {items.map((f) => {
                const v = values[f.key] ?? '';

                if (f.type === 'boolean') {
                  return (
                    <Toggle
                      key={f.key}
                      id={f.key}
                      label={f.label}
                      description={f.description}
                      checked={v === 'true'}
                      onChange={(c) => set(f.key, c ? 'true' : 'false')}
                    />
                  );
                }

                if (f.type === 'select') {
                  return (
                    <Select
                      key={f.key}
                      id={f.key}
                      label={f.label}
                      hint={f.description}
                      options={f.options ?? []}
                      placeholder={f.placeholder}
                      value={v}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  );
                }

                if (f.type === 'textarea') {
                  return (
                    <div key={f.key} className="flex flex-col gap-1.5">
                      <label htmlFor={f.key} className="text-xs font-medium text-text-secondary">
                        {f.label}
                      </label>
                      <textarea
                        id={f.key}
                        rows={4}
                        value={v}
                        placeholder={f.placeholder}
                        onChange={(e) => set(f.key, e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-border-focus resize-y"
                      />
                      {f.description && <p className="text-xs text-text-secondary">{f.description}</p>}
                    </div>
                  );
                }

                const inputType =
                  f.type === 'secret' ? 'password'
                  : f.type === 'number' ? 'number'
                  : f.type === 'url' ? 'url'
                  : f.type === 'email' ? 'email'
                  : 'text';

                return (
                  <Input
                    key={f.key}
                    id={f.key}
                    label={f.label}
                    type={inputType}
                    hint={f.description}
                    placeholder={f.placeholder}
                    value={v}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                );
              })}
            </div>
          </Card>
        ))}

        <div className="flex justify-end">
          <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}

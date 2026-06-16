'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { Card } from '@nb/common/ui/Card';
import { Badge } from '@nb/common/ui/Badge';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { toast } from '@nb/common/ui/toast.store';

interface ModuleState {
  id: string;
  name: string;
  icon?: string;
  tier?: string;
  enabled: boolean;
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/**
 * WordPress-style "Plugins" screen: every module with a per-tenant on/off
 * toggle. Disabling a module removes its menu items, slot contributions and
 * widgets for this tenant (state stored as `module.<id>.enabled` settings).
 */
export function ModuleManagerPage({ tenantId }: { tenantId: string }) {
  const [modules, setModules] = useState<ModuleState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const base = `/tenant/${tenantId}/api/modules`;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(base);
      setModules(res.data.modules ?? []);
    } catch (err) {
      setError(extractMessage(err, 'Failed to load modules.'));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(mod: ModuleState) {
    setBusy(mod.id);
    try {
      const res = await api.put(base, { id: mod.id, enabled: !mod.enabled });
      setModules(res.data.modules ?? []);
      toast.success(`${mod.name} ${!mod.enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to update module.'));
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const enabledCount = modules.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modules"
        subtitle={`${enabledCount} of ${modules.length} modules enabled for this tenant`}
      />
      {error && <AlertBanner variant="error" message={error} dismissible />}
      <Card>
        <ul className="divide-y divide-border">
          {modules.map((mod) => (
            <li key={mod.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary truncate">{mod.name}</span>
                  {mod.tier && <Badge variant="neutral" size="sm">{mod.tier}</Badge>}
                </div>
                <code className="text-xs text-text-tertiary">{mod.id}</code>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={mod.enabled}
                disabled={busy === mod.id}
                onClick={() => toggle(mod)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
                  mod.enabled ? 'bg-primary' : 'bg-surface-sunken border border-border',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    mod.enabled ? 'translate-x-6' : 'translate-x-1',
                  ].join(' ')}
                />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

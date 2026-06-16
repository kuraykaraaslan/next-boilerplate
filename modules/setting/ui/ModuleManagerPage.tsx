'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { Badge } from '@nb/common/ui/Badge';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { toast } from '@nb/common/ui/toast.store';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

interface ModuleRow extends Record<string, unknown> {
  id: string;
  name: string;
  icon?: string;
  tier?: string;
  version: string;
  description: string;
  author: string;
  homepage: string;
  license: string;
  tags: string[];
  enabled: boolean;
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/**
 * WordPress-style "Plugins" screen: a data table of every module with version,
 * developer/website metadata, and a per-tenant on/off toggle. Disabling a module
 * removes its menu items, slot contributions and widgets for this tenant.
 */
export function ModuleManagerPage({ tenantId }: { tenantId: string }) {
  const [modules, setModules] = useState<ModuleRow[]>([]);
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

  const toggle = useCallback(
    async (mod: ModuleRow) => {
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
    },
    [base],
  );

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const enabledCount = modules.filter((m) => m.enabled).length;

  const columns: TableColumn<ModuleRow>[] = [
    {
      key: 'name',
      header: 'Module',
      render: (m) => (
        <div className="min-w-0">
          <div className="font-medium text-text-primary truncate">{m.name}</div>
          <code className="text-xs text-text-tertiary">{m.id}</code>
          {m.description && (
            <p className="mt-0.5 text-xs text-text-secondary line-clamp-1 max-w-md">{m.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      render: (m) => <Badge variant="neutral" size="sm">v{m.version}</Badge>,
    },
    {
      key: 'author',
      header: 'Developer',
      render: (m) => {
        const label = m.author || (m.homepage ? 'Website' : '');
        if (!label) return <span className="text-text-tertiary">—</span>;
        if (m.homepage) {
          return (
            <a
              href={m.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {label}
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px]" aria-hidden />
            </a>
          );
        }
        return <span className="text-sm text-text-secondary">{label}</span>;
      },
    },
    {
      key: 'tier',
      header: 'Category',
      render: (m) => (m.tier ? <Badge variant="neutral" size="sm">{m.tier}</Badge> : <span className="text-text-tertiary">—</span>),
    },
    {
      key: '_status',
      header: 'Status',
      align: 'right',
      render: (m) => (
        <button
          type="button"
          role="switch"
          aria-checked={m.enabled}
          aria-label={`${m.enabled ? 'Disable' : 'Enable'} ${m.name}`}
          disabled={busy === m.id}
          onClick={() => toggle(m)}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
            m.enabled ? 'bg-primary' : 'bg-surface-sunken border border-border',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              m.enabled ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modules"
        subtitle={`${enabledCount} of ${modules.length} modules enabled for this tenant`}
      />
      {error && <AlertBanner variant="error" message={error} dismissible />}
      <ServerDataTable
        columns={columns}
        rows={modules}
        getRowKey={(m) => m.id}
        page={1}
        totalPages={1}
        total={modules.length}
        onPageChange={() => {}}
        hidePagination
        emptyMessage="No modules found."
      />
    </div>
  );
}

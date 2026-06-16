'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Badge } from '@nb/common/ui/badge.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { toast } from '@nb/common/ui/toast.store';
import api from '@nb/common/server/axios';

type Config = {
  enabled: boolean;
  policyVersion: string;
  bannerTitle: string;
  bannerMessage: string;
  purposes: { key: string; label: string; description: string; required: boolean }[];
};
type Record = {
  consentId: string;
  subjectUserId: string | null;
  subjectAnonymousId: string | null;
  purpose: string;
  granted: boolean;
  source: string;
  policyVersion: string;
  createdAt: string;
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ConsentPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [config, setConfig] = useState<Config | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, r] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/consent/config`),
        api.get(`/tenant/${tenantId}/api/consent/records`, { params: { pageSize: 100 } }),
      ]);
      setConfig(c.data.config);
      setRecords(r.data.data ?? []);
    } catch (err: unknown) {
      setError(extractMessage(err, 'Failed to load consent data.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveConfig() {
    if (!config) return;
    setBusy(true);
    try {
      await api.patch(`/tenant/${tenantId}/api/consent/config`, {
        enabled: config.enabled,
        policyVersion: config.policyVersion,
        bannerTitle: config.bannerTitle,
        bannerMessage: config.bannerMessage,
      });
      toast.success('Banner configuration saved.');
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to save configuration.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Consent"
        subtitle="Cookie-consent banner configuration and the append-only consent ledger."
        actions={[{ label: 'Refresh', variant: 'outline', onClick: fetchData }]}
      />

      {error && <AlertBanner variant="error" message={error} />}

      {loading ? (
        <div className="px-3 py-6 text-center text-text-secondary">Loading…</div>
      ) : (
        <>
          {config && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h2 className="text-sm font-medium text-text-primary">Banner configuration</h2>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
                Show the consent banner to visitors
              </label>
              <Input
                id="policy-version"
                label="Policy version (bump to re-prompt everyone)"
                value={config.policyVersion}
                onChange={(e) => setConfig({ ...config, policyVersion: e.target.value })}
              />
              <Input
                id="banner-title"
                label="Banner title"
                value={config.bannerTitle}
                onChange={(e) => setConfig({ ...config, bannerTitle: e.target.value })}
              />
              <Input
                id="banner-message"
                label="Banner message"
                value={config.bannerMessage}
                onChange={(e) => setConfig({ ...config, bannerMessage: e.target.value })}
              />
              <div className="flex flex-wrap gap-1">
                {config.purposes.map((p) => (
                  <Badge key={p.key} variant={p.required ? 'neutral' : 'info'} size="sm">
                    {p.label}{p.required ? ' (required)' : ''}
                  </Badge>
                ))}
              </div>
              <div className="flex justify-end border-t border-border pt-3">
                <Button variant="primary" onClick={saveConfig} disabled={busy}>Save configuration</Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-overlay text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Subject</th>
                  <th className="px-3 py-2 text-left font-medium">Purpose</th>
                  <th className="px-3 py-2 text-left font-medium">Decision</th>
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                  <th className="px-3 py-2 text-left font-medium">Policy</th>
                  <th className="px-3 py-2 text-left font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-text-secondary">No consent records yet.</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.consentId} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                        {r.subjectUserId ?? r.subjectAnonymousId ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-text-primary">{r.purpose}</td>
                      <td className="px-3 py-2">
                        <Badge variant={r.granted ? 'success' : 'neutral'}>{r.granted ? 'granted' : 'denied'}</Badge>
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{r.source}</td>
                      <td className="px-3 py-2 text-text-secondary">{r.policyVersion}</td>
                      <td className="px-3 py-2 text-text-secondary">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

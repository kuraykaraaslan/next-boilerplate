'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@nb/common/ui/Button';
import api from '@nb/common/server/axios';

type BannerPurpose = { key: string; label: string; description: string; required: boolean };
type BannerConfig = {
  enabled: boolean;
  policyVersion: string;
  bannerTitle: string;
  bannerMessage: string;
  purposes: BannerPurpose[];
};

const ANON_KEY = 'gdpr_anon_id';
const DONE_KEY = 'terms_consent_done';

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/**
 * Cookie-consent banner. Renders only when the tenant has enabled the banner and
 * the visitor hasn't already decided for the current policy version. Records the
 * visitor's per-purpose decisions against an anonymous id stored in localStorage.
 *
 * Drop into a tenant-facing layout: `<ConsentBanner tenantId={tenantId} />`.
 */
export function ConsentBanner({ tenantId }: { tenantId: string }) {
  const [config, setConfig] = useState<BannerConfig | null>(null);
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/tenant/${tenantId}/api/consent/config`);
        const cfg = res.data.config as BannerConfig;
        if (cancelled || !cfg?.enabled) return;
        // Re-prompt when the policy version changes.
        const done = localStorage.getItem(DONE_KEY);
        if (done === cfg.policyVersion) return;
        const initial: Record<string, boolean> = {};
        for (const p of cfg.purposes) initial[p.key] = p.required;
        setChoices(initial);
        setConfig(cfg);
        setVisible(true);
      } catch {
        // Config unavailable — fail closed (no banner, nothing recorded).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const submit = useCallback(
    async (decisions: Record<string, boolean>) => {
      if (!config) return;
      setSubmitting(true);
      try {
        const anonymousId = getAnonId();
        await api.post(`/tenant/${tenantId}/api/consent`, {
          anonymousId,
          policyVersion: config.policyVersion,
          decisions: config.purposes.map((p) => ({
            purpose: p.key,
            granted: p.required ? true : !!decisions[p.key],
          })),
        });
        localStorage.setItem(DONE_KEY, config.policyVersion);
        setVisible(false);
      } catch {
        // Keep the banner up so the visitor can retry.
      } finally {
        setSubmitting(false);
      }
    },
    [config, tenantId],
  );

  if (!visible || !config) return null;

  const acceptAll = () => submit(Object.fromEntries(config.purposes.map((p) => [p.key, true])));
  const rejectAll = () =>
    submit(Object.fromEntries(config.purposes.map((p) => [p.key, p.required])));

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-overlay p-4 shadow-lg">
      <div className="mx-auto max-w-3xl space-y-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{config.bannerTitle}</h2>
          <p className="text-sm text-text-secondary">{config.bannerMessage}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {config.purposes.map((p) => (
            <label key={p.key} className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={p.required ? true : !!choices[p.key]}
                disabled={p.required}
                onChange={(e) => setChoices((c) => ({ ...c, [p.key]: e.target.checked }))}
              />
              <span>
                <span className="font-medium text-text-primary">{p.label}</span>
                {p.required && <span className="ml-1 text-xs text-text-secondary">(always on)</span>}
                <span className="block text-xs text-text-secondary">{p.description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={submitting} onClick={rejectAll}>Reject all</Button>
          <Button variant="outline" disabled={submitting} onClick={() => submit(choices)}>Save selection</Button>
          <Button variant="primary" disabled={submitting} onClick={acceptAll}>Accept all</Button>
        </div>
      </div>
    </div>
  );
}

export default ConsentBanner;

'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';

interface FieldDecl { key: string; label?: string; help?: string; placeholder?: string }
interface SettingField extends FieldDecl { value: string }
interface SecretField extends FieldDecl { set: boolean }
interface PluginConfig {
  listingId: string;
  scopedName: string;
  name: string;
  settings: SettingField[];
  secrets: SecretField[];
  configured: boolean;
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/**
 * Generic per-tenant settings dialog for any installed community plugin. Renders
 * the plugin's manifest-declared `config.settings` (editable values) and
 * `config.secrets` (write-only; shown as set/not-set), backed by the single
 * `/api/marketplace/plugins/[listingId]/config` endpoint.
 */
export function PluginConfigModal({
  tenantId,
  listingId,
  pluginName,
  open,
  onClose,
}: {
  tenantId: string;
  listingId: string | null;
  pluginName?: string;
  open: boolean;
  onClose: (changed: boolean) => void;
}) {
  const [config, setConfig] = useState<PluginConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Local edits: settings by key, and secret inputs by key (blank = keep existing).
  const [settingVals, setSettingVals] = useState<Record<string, string>>({});
  const [secretVals, setSecretVals] = useState<Record<string, string>>({});
  const [savedOnce, setSavedOnce] = useState(false);

  const base = `/tenant/${tenantId}/api/marketplace/plugins`;

  const load = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    try {
      const res = await api.get(`${base}/${listingId}/config`);
      const cfg: PluginConfig = res.data.config;
      setConfig(cfg);
      setSettingVals(Object.fromEntries(cfg.settings.map((s) => [s.key, s.value])));
      setSecretVals({});
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to load plugin settings.'));
      onClose(false);
    } finally {
      setLoading(false);
    }
  }, [base, listingId, onClose]);

  useEffect(() => { if (open && listingId) { setSavedOnce(false); load(); } }, [open, listingId, load]);

  const save = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    try {
      // Only send secrets the admin actually typed (blank = keep existing).
      const secrets: Record<string, string> = {};
      for (const [k, v] of Object.entries(secretVals)) if (v.length > 0) secrets[k] = v;
      const res = await api.put(`${base}/${config.listingId}/config`, { settings: settingVals, secrets });
      setConfig(res.data.config);
      setSecretVals({});
      setSavedOnce(true);
      toast.success(`${config.name} settings saved`);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to save plugin settings.'));
    } finally {
      setSaving(false);
    }
  }, [base, config, settingVals, secretVals]);

  const hasFields = !!config && (config.settings.length > 0 || config.secrets.length > 0);

  return (
    <Modal
      open={open}
      onClose={() => onClose(savedOnce)}
      title={config ? `Configure “${config.name}”` : `Configure ${pluginName ?? 'plugin'}`}
      description="Settings and credentials apply only to this tenant. Credentials are stored encrypted and never shown again."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose(savedOnce)}>Close</Button>
          {hasFields && <Button variant="primary" loading={saving} onClick={save}>Save</Button>}
        </div>
      }
    >
      {loading && <div className="flex justify-center py-8"><Spinner /></div>}
      {!loading && config && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-xs">
            <code className="text-text-tertiary">{config.scopedName}</code>
            <Badge variant={config.configured ? 'success' : 'neutral'} size="sm" dot>
              {config.configured ? 'Configured' : 'Not configured'}
            </Badge>
          </div>

          {config.settings.map((s) => (
            <Input
              key={s.key}
              id={`setting-${s.key}`}
              label={s.label ?? s.key}
              hint={s.help}
              placeholder={s.placeholder}
              value={settingVals[s.key] ?? ''}
              onChange={(e) => setSettingVals((p) => ({ ...p, [s.key]: e.target.value }))}
            />
          ))}

          {config.secrets.map((s) => (
            <Input
              key={s.key}
              id={`secret-${s.key}`}
              label={s.label ?? s.key}
              type="password"
              hint={s.help ?? (s.set ? 'A value is set. Leave blank to keep it.' : 'No value set yet.')}
              placeholder={s.set ? '•••••••• (unchanged)' : 'Enter value'}
              value={secretVals[s.key] ?? ''}
              onChange={(e) => setSecretVals((p) => ({ ...p, [s.key]: e.target.value }))}
            />
          ))}

          {!hasFields && (
            <p className="text-sm text-text-secondary py-2">This plugin has no configurable settings.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

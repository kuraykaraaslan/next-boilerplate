'use client';
import { useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules/ui/Card';
import { Input } from '@/modules/ui/Input';
import { Button } from '@/modules/ui/Button';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Spinner } from '@/modules/ui/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faEnvelope, faGlobe } from '@fortawesome/free-solid-svg-icons';

interface Settings {
  appName: string;
  appUrl: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    appName: '',
    appUrl: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/system/api/settings')
      .then((res) => {
        const s = res.data.settings ?? {};
        setSettings((prev) => ({ ...prev, ...s }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(section: Partial<Settings>) {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await api.put('/system/api/settings', { settings: { ...settings, ...section } });
      setSettings((prev) => ({ ...prev, ...section }));
      setSuccessMsg('Settings saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">System Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">Configure global system behaviour</p>
      </div>

      {successMsg && <AlertBanner variant="success" message={successMsg} dismissible />}
      {errorMsg && <AlertBanner variant="error" message={errorMsg} dismissible />}

      <Card title="General" subtitle="Basic application configuration">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave({ appName: settings.appName, appUrl: settings.appUrl }); }}
          className="space-y-4"
        >
          <Input
            id="app-name"
            label="Application Name"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={settings.appName}
            onChange={(e) => setSettings((v) => ({ ...v, appName: e.target.value }))}
          />
          <Input
            id="app-url"
            label="Application URL"
            type="url"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={settings.appUrl}
            onChange={(e) => setSettings((v) => ({ ...v, appUrl: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save General
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Email / SMTP" subtitle="Outbound email configuration">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave({ smtpHost: settings.smtpHost, smtpPort: settings.smtpPort, smtpUser: settings.smtpUser });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="smtp-host"
              label="SMTP Host"
              prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
              value={settings.smtpHost}
              onChange={(e) => setSettings((v) => ({ ...v, smtpHost: e.target.value }))}
            />
            <Input
              id="smtp-port"
              label="SMTP Port"
              type="number"
              value={settings.smtpPort}
              onChange={(e) => setSettings((v) => ({ ...v, smtpPort: e.target.value }))}
            />
          </div>
          <Input
            id="smtp-user"
            label="SMTP Username"
            type="email"
            prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
            value={settings.smtpUser}
            onChange={(e) => setSettings((v) => ({ ...v, smtpUser: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save Email Config
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

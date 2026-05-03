'use client';
import { useState } from 'react';
import { Card } from '@/modules/ui/Card';
import { Input } from '@/modules/ui/Input';
import { Button } from '@/modules/ui/Button';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faEnvelope, faGlobe } from '@fortawesome/free-solid-svg-icons';

export default function SystemSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [general, setGeneral] = useState({ appName: 'Next Boilerplate', appUrl: 'https://example.com' });
  const [email, setEmail] = useState({ smtpHost: 'smtp.example.com', smtpPort: '587', smtpUser: 'noreply@example.com' });

  async function saveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">System Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">Configure global system behaviour</p>
      </div>

      {saved && (
        <AlertBanner variant="success" message="Settings saved successfully." dismissible />
      )}

      <Card title="General" subtitle="Basic application configuration">
        <form onSubmit={saveGeneral} className="space-y-4">
          <Input
            id="app-name"
            label="Application Name"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={general.appName}
            onChange={(e) => setGeneral((v) => ({ ...v, appName: e.target.value }))}
          />
          <Input
            id="app-url"
            label="Application URL"
            type="url"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={general.appUrl}
            onChange={(e) => setGeneral((v) => ({ ...v, appUrl: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" iconLeft={<FontAwesomeIcon icon={faSave} />}>Save General</Button>
          </div>
        </form>
      </Card>

      <Card title="Email / SMTP" subtitle="Outbound email configuration">
        <form onSubmit={saveGeneral} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="smtp-host"
              label="SMTP Host"
              prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
              value={email.smtpHost}
              onChange={(e) => setEmail((v) => ({ ...v, smtpHost: e.target.value }))}
            />
            <Input
              id="smtp-port"
              label="SMTP Port"
              type="number"
              value={email.smtpPort}
              onChange={(e) => setEmail((v) => ({ ...v, smtpPort: e.target.value }))}
            />
          </div>
          <Input
            id="smtp-user"
            label="SMTP Username"
            type="email"
            prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
            value={email.smtpUser}
            onChange={(e) => setEmail((v) => ({ ...v, smtpUser: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" iconLeft={<FontAwesomeIcon icon={faSave} />}>Save Email Config</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

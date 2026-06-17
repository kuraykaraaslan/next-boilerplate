'use client';

import { useState } from 'react';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faServer } from '@fortawesome/free-solid-svg-icons';
import { SaveRow, type TabProps } from './platform-tab.shared.component';

const SMTP_ENCRYPTION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'tls', label: 'TLS' },
  { value: 'ssl', label: 'SSL' },
];

export function PlatformEmailTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    smtpHost: settings.smtpHost ?? '',
    smtpPort: settings.smtpPort ?? '587',
    smtpUsername: settings.smtpUsername ?? '',
    smtpPassword: settings.smtpPassword ?? '',
    smtpEncryption: settings.smtpEncryption ?? 'tls',
    fromEmail: settings.fromEmail ?? '',
    fromName: settings.fromName ?? '',
  });

  function patch(key: keyof typeof f, val: string) { setF((p) => ({ ...p, [key]: val })); }

  return (
    <div className="pt-6 space-y-6">
      <Card title="SMTP Configuration" subtitle="Outbound email server">
        <form onSubmit={(e) => { e.preventDefault(); onSave(f); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input id="smtpHost" label="SMTP Host" value={f.smtpHost} placeholder="smtp.sendgrid.net"
                prefixIcon={<FontAwesomeIcon icon={faServer} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('smtpHost', e.target.value)} />
            </div>
            <Input id="smtpPort" label="Port" type="number" value={f.smtpPort}
              onChange={(e) => patch('smtpPort', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="smtpUsername" label="Username" value={f.smtpUsername}
              onChange={(e) => patch('smtpUsername', e.target.value)} />
            <Input id="smtpPassword" label="Password" type="password" value={f.smtpPassword}
              onChange={(e) => patch('smtpPassword', e.target.value)} />
          </div>
          <Select id="smtpEncryption" label="Encryption" options={SMTP_ENCRYPTION_OPTIONS}
            value={f.smtpEncryption} onChange={(e) => patch('smtpEncryption', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Sender Identity">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ fromEmail: f.fromEmail, fromName: f.fromName }); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="fromName" label="From Name" value={f.fromName}
              onChange={(e) => patch('fromName', e.target.value)} />
            <Input id="fromEmail" label="From Email" type="email" value={f.fromEmail}
              prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
              onChange={(e) => patch('fromEmail', e.target.value)} />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

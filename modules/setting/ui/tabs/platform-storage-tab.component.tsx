'use client';

import { useState } from 'react';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { b, bStr, SaveRow, type SR, type TabProps } from './platform-tab.shared.component';
import { AllowedExtensionsField } from './allowed-extensions-field.component';

const STORAGE_PROVIDER_OPTIONS = [
  { value: 'aws-s3', label: 'Amazon S3' },
  { value: 'cloudflare-r2', label: 'Cloudflare R2' },
  { value: 'digitalocean-spaces', label: 'DigitalOcean Spaces' },
  { value: 'minio', label: 'MinIO' },
];

const SCAN_MODE_OPTIONS = [
  { value: 'async', label: 'Asynchronous (scan in background)' },
  { value: 'sync', label: 'Synchronous (block upload until scanned)' },
];

const SCAN_PROVIDER_OPTIONS = [
  { value: 'virustotal', label: 'VirusTotal' },
];

const SCAN_INFECTED_ACTION_OPTIONS = [
  { value: 'quarantine', label: 'Quarantine (move to isolated folder)' },
  { value: 'delete', label: 'Delete immediately' },
];

export function PlatformStorageTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    storageProvider: settings.storageProvider ?? 'aws-s3',
    s3Bucket: settings.s3Bucket ?? '',
    s3Region: settings.s3Region ?? '',
    s3AccessKey: settings.s3AccessKey ?? '',
    s3SecretKey: settings.s3SecretKey ?? '',
    s3Endpoint: settings.s3Endpoint ?? '',
    maxFileSizeMb: settings.maxFileSizeMb ?? '10',
    allowedExtensions: settings.allowedExtensions ?? '',
    // Virus / malware scanning
    virusScanEnabled: b(settings.virusScanEnabled),
    virusScanMode: settings.virusScanMode ?? 'async',
    virusScanProvider: settings.virusScanProvider ?? 'virustotal',
    virusScanApiKey: settings.virusScanApiKey ?? '',
    virusScanTimeoutSeconds: settings.virusScanTimeoutSeconds ?? '30',
    virusScanInfectedAction: settings.virusScanInfectedAction ?? 'quarantine',
    virusScanQuarantineFolder: settings.virusScanQuarantineFolder ?? 'quarantine',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) { setF((p) => ({ ...p, [key]: val })); }
  const showEndpoint = f.storageProvider !== 'aws-s3';

  function storagePatch(): SR {
    return {
      storageProvider: f.storageProvider,
      s3Bucket: f.s3Bucket,
      s3Region: f.s3Region,
      s3AccessKey: f.s3AccessKey,
      s3SecretKey: f.s3SecretKey,
      s3Endpoint: f.s3Endpoint,
      maxFileSizeMb: f.maxFileSizeMb,
      allowedExtensions: f.allowedExtensions,
    };
  }

  function scanPatch(): SR {
    return {
      virusScanEnabled: bStr(f.virusScanEnabled),
      virusScanMode: f.virusScanMode,
      virusScanProvider: f.virusScanProvider,
      virusScanApiKey: f.virusScanApiKey,
      virusScanTimeoutSeconds: f.virusScanTimeoutSeconds,
      virusScanInfectedAction: f.virusScanInfectedAction,
      virusScanQuarantineFolder: f.virusScanQuarantineFolder,
    };
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Storage Provider">
        <form onSubmit={(e) => { e.preventDefault(); onSave(storagePatch()); }} className="space-y-4">
          <Select id="storageProvider" label="Provider" options={STORAGE_PROVIDER_OPTIONS}
            value={f.storageProvider} onChange={(e) => patch('storageProvider', e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="s3Bucket" label="Bucket Name" value={f.s3Bucket}
              onChange={(e) => patch('s3Bucket', e.target.value)} />
            <Input id="s3Region" label="Region" value={f.s3Region}
              onChange={(e) => patch('s3Region', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="s3AccessKey" label="Access Key" value={f.s3AccessKey}
              onChange={(e) => patch('s3AccessKey', e.target.value)} />
            <Input id="s3SecretKey" label="Secret Key" type="password" value={f.s3SecretKey}
              onChange={(e) => patch('s3SecretKey', e.target.value)} />
          </div>
          {showEndpoint && (
            <Input id="s3Endpoint" label="Custom Endpoint URL" type="url" value={f.s3Endpoint}
              onChange={(e) => patch('s3Endpoint', e.target.value)} />
          )}
          <Input id="maxFileSizeMb" label="Max File Size (MB)" type="number" value={f.maxFileSizeMb}
            onChange={(e) => patch('maxFileSizeMb', e.target.value)} />
          <AllowedExtensionsField value={f.allowedExtensions}
            onChange={(val) => patch('allowedExtensions', val)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Virus Scanning" subtitle="Scan uploaded files for malware before they are served">
        <form onSubmit={(e) => { e.preventDefault(); onSave(scanPatch()); }} className="space-y-5">
          <Toggle id="virusScanEnabled" label="Enable virus scanning"
            description="Uploads are checked against the configured provider. Infected files are blocked."
            checked={f.virusScanEnabled} onChange={(v) => patch('virusScanEnabled', v)} />

          {f.virusScanEnabled && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select id="virusScanProvider" label="Provider" options={SCAN_PROVIDER_OPTIONS}
                  value={f.virusScanProvider} onChange={(e) => patch('virusScanProvider', e.target.value)} />
                <Select id="virusScanMode" label="Scan Mode" options={SCAN_MODE_OPTIONS}
                  value={f.virusScanMode} onChange={(e) => patch('virusScanMode', e.target.value)} />
              </div>
              <Input id="virusScanApiKey" label="Provider API Key" type="password" value={f.virusScanApiKey}
                onChange={(e) => patch('virusScanApiKey', e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="virusScanTimeoutSeconds" label="Scan Timeout (seconds)" type="number" min={1}
                  value={f.virusScanTimeoutSeconds} onChange={(e) => patch('virusScanTimeoutSeconds', e.target.value)} />
                <Select id="virusScanInfectedAction" label="When Infected" options={SCAN_INFECTED_ACTION_OPTIONS}
                  value={f.virusScanInfectedAction} onChange={(e) => patch('virusScanInfectedAction', e.target.value)} />
              </div>
              {f.virusScanInfectedAction === 'quarantine' && (
                <Input id="virusScanQuarantineFolder" label="Quarantine Folder" value={f.virusScanQuarantineFolder}
                  hint="Folder prefix where infected objects are isolated."
                  onChange={(e) => patch('virusScanQuarantineFolder', e.target.value)} />
              )}
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

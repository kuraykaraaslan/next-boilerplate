'use client';

import { useState } from 'react';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { SaveRow, type TabProps } from './platform-tab.shared';

const STORAGE_PROVIDER_OPTIONS = [
  { value: 'aws-s3', label: 'Amazon S3' },
  { value: 'cloudflare-r2', label: 'Cloudflare R2' },
  { value: 'digitalocean-spaces', label: 'DigitalOcean Spaces' },
  { value: 'minio', label: 'MinIO' },
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
  });

  function patch(key: keyof typeof f, val: string) { setF((p) => ({ ...p, [key]: val })); }
  const showEndpoint = f.storageProvider !== 'aws-s3';

  return (
    <div className="pt-6 space-y-6">
      <Card title="Storage Provider">
        <form onSubmit={(e) => { e.preventDefault(); onSave(f); }} className="space-y-4">
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
          <Input id="allowedExtensions" label="Allowed Extensions" value={f.allowedExtensions}
            placeholder="jpg,png,pdf,docx"
            onChange={(e) => patch('allowedExtensions', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

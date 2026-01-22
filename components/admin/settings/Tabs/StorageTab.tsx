'use client';

import DynamicText from '@/components/common/forms/DynamicText';
import DynamicSelect from '@/components/common/forms/DynamicSelect';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function StorageTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Storage Provider</h3>
                    <p className="text-sm text-base-content/60 mb-4">File storage configuration</p>

                    <DynamicSelect
                        label="Provider"
                        selectedValue={settings.storageProvider || ''}
                        onValueChange={v => setSettings(s => ({ ...s, storageProvider: v }))}
                        options={[
                            { value: 'local', label: 'Local' },
                            { value: 's3', label: 'AWS S3' },
                            { value: 'gcs', label: 'Google Cloud Storage' },
                            { value: 'azure', label: 'Azure Blob' },
                            { value: 'r2', label: 'Cloudflare R2' },
                        ]}
                        className="max-w-xs"
                        disabled={isDisabled}
                    />
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">S3 Configuration</h3>
                    <p className="text-sm text-base-content/60 mb-4">AWS S3 or compatible storage</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Bucket Name"
                            placeholder="my-bucket"
                            value={settings.s3Bucket || ''}
                            setValue={v => setSettings(s => ({ ...s, s3Bucket: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Region"
                            placeholder="eu-central-1"
                            value={settings.s3Region || ''}
                            setValue={v => setSettings(s => ({ ...s, s3Region: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Access Key ID"
                            type="password"
                            placeholder="********"
                            value={settings.s3AccessKey || ''}
                            setValue={v => setSettings(s => ({ ...s, s3AccessKey: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Secret Access Key"
                            type="password"
                            placeholder="********"
                            value={settings.s3SecretKey || ''}
                            setValue={v => setSettings(s => ({ ...s, s3SecretKey: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Custom Endpoint (optional)"
                            type="url"
                            placeholder="https://s3.custom-endpoint.com"
                            value={settings.s3Endpoint || ''}
                            setValue={v => setSettings(s => ({ ...s, s3Endpoint: v }))}
                            className="md:col-span-2"
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Upload Limits</h3>
                    <p className="text-sm text-base-content/60 mb-4">File upload restrictions</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Max File Size (MB)"
                            type="number"
                            placeholder="10"
                            value={settings.maxFileSizeMb || ''}
                            setValue={v => setSettings(s => ({ ...s, maxFileSizeMb: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Allowed Extensions"
                            placeholder="jpg,png,gif,pdf"
                            value={settings.allowedExtensions || ''}
                            setValue={v => setSettings(s => ({ ...s, allowedExtensions: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

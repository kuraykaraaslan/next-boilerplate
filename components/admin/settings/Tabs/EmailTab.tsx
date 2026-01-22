'use client';

import DynamicText from '@/components/common/forms/DynamicText';
import DynamicSelect from '@/components/common/forms/DynamicSelect';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function EmailTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">SMTP Configuration</h3>
                    <p className="text-sm text-base-content/60 mb-4">Email server settings</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="SMTP Host"
                            placeholder="smtp.example.com"
                            value={settings.smtpHost || ''}
                            setValue={v => setSettings(s => ({ ...s, smtpHost: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="SMTP Port"
                            type="number"
                            placeholder="587"
                            value={settings.smtpPort || ''}
                            setValue={v => setSettings(s => ({ ...s, smtpPort: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="SMTP Username"
                            placeholder="user@example.com"
                            value={settings.smtpUsername || ''}
                            setValue={v => setSettings(s => ({ ...s, smtpUsername: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="SMTP Password"
                            type="password"
                            placeholder="********"
                            value={settings.smtpPassword || ''}
                            setValue={v => setSettings(s => ({ ...s, smtpPassword: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Encryption"
                            selectedValue={settings.smtpEncryption || ''}
                            onValueChange={v => setSettings(s => ({ ...s, smtpEncryption: v }))}
                            options={[
                                { value: 'tls', label: 'TLS' },
                                { value: 'ssl', label: 'SSL' },
                                { value: 'none', label: 'None' },
                            ]}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Email Defaults</h3>
                    <p className="text-sm text-base-content/60 mb-4">Default email settings</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="From Email"
                            type="email"
                            placeholder="noreply@example.com"
                            value={settings.fromEmail || ''}
                            setValue={v => setSettings(s => ({ ...s, fromEmail: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="From Name"
                            placeholder="My Website"
                            value={settings.fromName || ''}
                            setValue={v => setSettings(s => ({ ...s, fromName: v }))}
                            disabled={isDisabled}
                        />
                    </div>

                    <div className="mt-4">
                        <button className="btn btn-outline btn-sm" disabled={isDisabled}>
                            Send Test Email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

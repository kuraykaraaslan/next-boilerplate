'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import { TenantSettingsTabProps } from '@/modules/tenant_setting/tenant_setting.types';

export default function GeneralTab({ settings, setSettings, loading, saving }: TenantSettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Tenant Information</h3>
                    <p className="text-sm text-base-content/60 mb-4">Basic tenant configuration</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Tenant Name"
                            placeholder="My Organization"
                            value={settings.tenantName || ''}
                            setValue={v => setSettings(s => ({ ...s, tenantName: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Tenant Description"
                            placeholder="A brief description of your organization"
                            value={settings.tenantDescription || ''}
                            setValue={v => setSettings(s => ({ ...s, tenantDescription: v }))}
                            isTextarea
                            rows={3}
                            className="md:col-span-2"
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Contact Information</h3>
                    <p className="text-sm text-base-content/60 mb-4">Organization contact details</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Contact Email"
                            type="email"
                            placeholder="contact@organization.com"
                            value={settings.contactEmail || ''}
                            setValue={v => setSettings(s => ({ ...s, contactEmail: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Contact Phone"
                            type="tel"
                            placeholder="+1234567890"
                            value={settings.contactPhone || ''}
                            setValue={v => setSettings(s => ({ ...s, contactPhone: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Contact Address"
                            placeholder="123 Main St, City, Country"
                            value={settings.contactAddress || ''}
                            setValue={v => setSettings(s => ({ ...s, contactAddress: v }))}
                            isTextarea
                            rows={2}
                            className="md:col-span-2"
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Localization</h3>
                    <p className="text-sm text-base-content/60 mb-4">Time and language settings</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Timezone"
                            placeholder="Europe/Istanbul"
                            value={settings.timezone || ''}
                            setValue={v => setSettings(s => ({ ...s, timezone: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Language"
                            placeholder="en"
                            value={settings.language || ''}
                            setValue={v => setSettings(s => ({ ...s, language: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Date Format"
                            placeholder="DD/MM/YYYY"
                            value={settings.dateFormat || ''}
                            setValue={v => setSettings(s => ({ ...s, dateFormat: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Time Format"
                            placeholder="HH:mm"
                            value={settings.timeFormat || ''}
                            setValue={v => setSettings(s => ({ ...s, timeFormat: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

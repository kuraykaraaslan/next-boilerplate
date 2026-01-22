'use client';

import DynamicText from '@/components/admin/UI/Forms/DynamicText';
import DynamicToggle from '@/components/admin/UI/Forms/DynamicToggle';
import { SettingsTabProps } from '@/types/common/SettingTypes';

export default function GeneralTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow border-2 border-warning">
                <div className="card-body">
                    <h3 className="card-title text-lg text-warning">⚠️ Maintenance Mode</h3>
                    <p className="text-sm text-base-content/60 mb-4">When enabled, visitors will see maintenance page</p>

                    <div className="grid grid-cols-1 gap-4">
                        <DynamicToggle
                            label="Enable Maintenance Mode"
                            checked={settings.maintenanceMode === 'true'}
                            onChange={(v: any) => setSettings(s => ({ ...s, maintenanceMode: String(v) }))}
                            disabled={isDisabled}
                        />

                        {settings.maintenanceMode === 'true' && (
                            <DynamicText
                                label="Maintenance Message"
                                placeholder="We are currently performing scheduled maintenance. Please check back soon."
                                value={settings.maintenanceMessage || ''}
                                setValue={v => setSettings(s => ({ ...s, maintenanceMessage: v }))}
                                isTextarea
                                rows={3}
                                disabled={isDisabled}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Site Information</h3>
                    <p className="text-sm text-base-content/60 mb-4">Basic site configuration</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Site Name"
                            placeholder="My Website"
                            value={settings.siteName || ''}
                            setValue={v => setSettings(s => ({ ...s, siteName: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Site URL"
                            type="url"
                            placeholder="https://example.com"
                            value={settings.siteUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, siteUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Site Description"
                            placeholder="A brief description of your site"
                            value={settings.siteDescription || ''}
                            setValue={v => setSettings(s => ({ ...s, siteDescription: v }))}
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
                    <h3 className="card-title text-lg">Server Configuration</h3>
                    <p className="text-sm text-base-content/60 mb-4">Application host and domain settings</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Application Host"
                            type="url"
                            placeholder="http://localhost:3000"
                            value={settings.applicationHost || ''}
                            setValue={v => setSettings(s => ({ ...s, applicationHost: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Application Domain"
                            placeholder="example.com"
                            value={settings.applicationDomain || ''}
                            setValue={v => setSettings(s => ({ ...s, applicationDomain: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Supported Languages"
                            placeholder="en,de,tr,gr"
                            value={settings.i18nLanguages || ''}
                            setValue={v => setSettings(s => ({ ...s, i18nLanguages: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Branding</h3>
                    <p className="text-sm text-base-content/60 mb-4">Logo and visual identity</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Logo URL"
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={settings.logoUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, logoUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Favicon URL"
                            type="url"
                            placeholder="https://example.com/favicon.ico"
                            value={settings.faviconUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, faviconUrl: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Contact Information</h3>
                    <p className="text-sm text-base-content/60 mb-4">Default contact details</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Contact Name"
                            placeholder="John Doe"
                            value={settings.contactName || ''}
                            setValue={v => setSettings(s => ({ ...s, contactName: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Contact Title"
                            placeholder="Software Developer"
                            value={settings.contactTitle || ''}
                            setValue={v => setSettings(s => ({ ...s, contactTitle: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Contact Email"
                            type="email"
                            placeholder="contact@example.com"
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
                    </div>
                </div>
            </div>
        </div>
    );
}

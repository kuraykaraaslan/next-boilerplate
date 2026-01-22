'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import DynamicToggle from '@/modules/ui/forms/DynamicToggle';
import { TenantSettingsTabProps } from '@/modules/tenant_setting/tenant_setting.types';

export default function FeatureTab({ settings, setSettings, loading, saving }: TenantSettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Core Features</h3>
                    <p className="text-sm text-base-content/60 mb-4">Enable or disable tenant features</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicToggle
                            label="Chat"
                            description="Enable real-time chat functionality"
                            checked={settings.featureChat === 'true'}
                            onChange={v => setSettings(s => ({ ...s, featureChat: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Notifications"
                            description="Enable push notifications"
                            checked={settings.featureNotifications === 'true'}
                            onChange={v => setSettings(s => ({ ...s, featureNotifications: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Analytics"
                            description="Enable analytics dashboard"
                            checked={settings.featureAnalytics === 'true'}
                            onChange={v => setSettings(s => ({ ...s, featureAnalytics: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Export"
                            description="Enable data export functionality"
                            checked={settings.featureExport === 'true'}
                            onChange={v => setSettings(s => ({ ...s, featureExport: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Import"
                            description="Enable data import functionality"
                            checked={settings.featureImport === 'true'}
                            onChange={v => setSettings(s => ({ ...s, featureImport: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="API Access"
                            description="Enable API access for this tenant"
                            checked={settings.featureApi === 'true'}
                            onChange={v => setSettings(s => ({ ...s, featureApi: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Webhooks"
                            description="Enable webhook integrations"
                            checked={settings.featureWebhooks === 'true'}
                            onChange={v => setSettings(s => ({ ...s, featureWebhooks: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Integrations"
                            description="Enable third-party integrations"
                            checked={settings.featureIntegrations === 'true'}
                            onChange={v => setSettings(s => ({ ...s, featureIntegrations: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Limits</h3>
                    <p className="text-sm text-base-content/60 mb-4">Resource limits for this tenant</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DynamicText
                            label="Max Users"
                            type="number"
                            placeholder="100"
                            value={settings.maxUsers || ''}
                            setValue={v => setSettings(s => ({ ...s, maxUsers: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Max Storage (GB)"
                            type="number"
                            placeholder="10"
                            value={settings.maxStorage || ''}
                            setValue={v => setSettings(s => ({ ...s, maxStorage: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Max Projects"
                            type="number"
                            placeholder="50"
                            value={settings.maxProjects || ''}
                            setValue={v => setSettings(s => ({ ...s, maxProjects: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

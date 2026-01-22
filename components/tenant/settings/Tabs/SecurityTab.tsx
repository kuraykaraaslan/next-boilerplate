'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import DynamicToggle from '@/modules/ui/forms/DynamicToggle';
import { TenantSettingsTabProps } from '@/modules/tenant_setting/tenant_setting.types';

export default function SecurityTab({ settings, setSettings, loading, saving }: TenantSettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Authentication</h3>
                    <p className="text-sm text-base-content/60 mb-4">Authentication requirements for members</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicToggle
                            label="Two-Factor Authentication Required"
                            description="Require 2FA for all members"
                            checked={settings.twoFactorRequired === 'true'}
                            onChange={v => setSettings(s => ({ ...s, twoFactorRequired: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Session Timeout (minutes)"
                            type="number"
                            placeholder="60"
                            value={settings.sessionTimeout || ''}
                            setValue={v => setSettings(s => ({ ...s, sessionTimeout: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Max Login Attempts"
                            type="number"
                            placeholder="5"
                            value={settings.maxLoginAttempts || ''}
                            setValue={v => setSettings(s => ({ ...s, maxLoginAttempts: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Password Policy</h3>
                    <p className="text-sm text-base-content/60 mb-4">Password requirements for members</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Minimum Password Length"
                            type="number"
                            placeholder="8"
                            value={settings.passwordMinLength || ''}
                            setValue={v => setSettings(s => ({ ...s, passwordMinLength: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Require Uppercase"
                            description="Password must contain uppercase letters"
                            checked={settings.passwordRequireUppercase === 'true'}
                            onChange={v => setSettings(s => ({ ...s, passwordRequireUppercase: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Require Numbers"
                            description="Password must contain numbers"
                            checked={settings.passwordRequireNumbers === 'true'}
                            onChange={v => setSettings(s => ({ ...s, passwordRequireNumbers: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Require Symbols"
                            description="Password must contain special characters"
                            checked={settings.passwordRequireSymbols === 'true'}
                            onChange={v => setSettings(s => ({ ...s, passwordRequireSymbols: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">IP Restrictions</h3>
                    <p className="text-sm text-base-content/60 mb-4">Control access by IP address</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="IP Whitelist"
                            placeholder="192.168.1.1, 10.0.0.0/24"
                            value={settings.ipWhitelist || ''}
                            setValue={v => setSettings(s => ({ ...s, ipWhitelist: v }))}
                            isTextarea
                            rows={3}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="IP Blacklist"
                            placeholder="192.168.1.100, 10.0.0.50"
                            value={settings.ipBlacklist || ''}
                            setValue={v => setSettings(s => ({ ...s, ipBlacklist: v }))}
                            isTextarea
                            rows={3}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Single Sign-On (SSO)</h3>
                    <p className="text-sm text-base-content/60 mb-4">Enterprise SSO configuration</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicToggle
                            label="Enable SSO"
                            description="Allow SSO authentication"
                            checked={settings.ssoEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, ssoEnabled: String(v) }))}
                            disabled={isDisabled}
                        />

                        {settings.ssoEnabled === 'true' && (
                            <>
                                <DynamicText
                                    label="SSO Provider"
                                    placeholder="okta, azure, google"
                                    value={settings.ssoProvider || ''}
                                    setValue={v => setSettings(s => ({ ...s, ssoProvider: v }))}
                                    disabled={isDisabled}
                                />

                                <DynamicText
                                    label="SSO Configuration (JSON)"
                                    placeholder='{"clientId": "...", "clientSecret": "..."}'
                                    value={settings.ssoConfig || ''}
                                    setValue={v => setSettings(s => ({ ...s, ssoConfig: v }))}
                                    isTextarea
                                    rows={4}
                                    className="md:col-span-2"
                                    disabled={isDisabled}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

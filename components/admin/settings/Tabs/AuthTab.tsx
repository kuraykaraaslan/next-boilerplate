'use client';

import DynamicText from '@/components/common/forms/DynamicText';
import DynamicToggle from '@/components/common/forms/DynamicToggle';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function AuthTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    const oauthProviders = [
        { key: 'oauthGoogle', label: 'Google' },
        { key: 'oauthGitHub', label: 'GitHub' },
        { key: 'oauthMicrosoft', label: 'Microsoft' },
        { key: 'oauthLinkedIn', label: 'LinkedIn' },
        { key: 'oauthApple', label: 'Apple' },
        { key: 'oauthTwitter', label: 'Twitter' },
        { key: 'oauthMeta', label: 'Meta (Facebook)' },
        { key: 'oauthAutodesk', label: 'Autodesk' },
    ];

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Registration</h3>
                    <p className="text-sm text-base-content/60 mb-4">User registration settings</p>
                    <div className="space-y-4">
                        <DynamicToggle
                            label="Allow Registration"
                            description="Enable new user signups"
                            checked={settings.allowRegistration === 'true'}
                            onChange={v => setSettings(s => ({ ...s, allowRegistration: v ? 'true' : 'false' }))}
                            disabled={isDisabled}
                        />
                        <DynamicToggle
                            label="Email Verification Required"
                            description="Require email verification before login"
                            checked={settings.emailVerificationRequired === 'true'}
                            onChange={v => setSettings(s => ({ ...s, emailVerificationRequired: v ? 'true' : 'false' }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Session & JWT</h3>
                    <p className="text-sm text-base-content/60 mb-4">Session and token settings</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Session Duration (hours)"
                            type="number"
                            placeholder="24"
                            value={settings.sessionDuration || ''}
                            setValue={v => setSettings(s => ({ ...s, sessionDuration: v }))}
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
                        <DynamicText
                            label="Access Token Secret"
                            type="password"
                            placeholder="your-access-token-secret"
                            value={settings.jwtAccessTokenSecret || ''}
                            setValue={v => setSettings(s => ({ ...s, jwtAccessTokenSecret: v }))}
                            disabled={isDisabled}
                        />
                        <DynamicText
                            label="Access Token Expires In"
                            placeholder="1h"
                            value={settings.jwtAccessTokenExpiresIn || ''}
                            setValue={v => setSettings(s => ({ ...s, jwtAccessTokenExpiresIn: v }))}
                            disabled={isDisabled}
                        />
                        <DynamicText
                            label="Refresh Token Secret"
                            type="password"
                            placeholder="your-refresh-token-secret"
                            value={settings.jwtRefreshTokenSecret || ''}
                            setValue={v => setSettings(s => ({ ...s, jwtRefreshTokenSecret: v }))}
                            disabled={isDisabled}
                        />
                        <DynamicText
                            label="Refresh Token Expires In"
                            placeholder="7d"
                            value={settings.jwtRefreshTokenExpiresIn || ''}
                            setValue={v => setSettings(s => ({ ...s, jwtRefreshTokenExpiresIn: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">OAuth Providers</h3>
                    <p className="text-sm text-base-content/60 mb-4">Enable/disable social login providers</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {oauthProviders.map((provider) => (
                            <DynamicToggle
                                key={provider.key}
                                label={provider.label}
                                checked={settings[provider.key] === 'true'}
                                onChange={v => setSettings(s => ({ ...s, [provider.key]: v ? 'true' : 'false' }))}
                                disabled={isDisabled}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Google OAuth */}
            {settings.oauthGoogle === 'true' && (
                <div className="card bg-base-100 shadow">
                    <div className="card-body">
                        <h3 className="card-title text-lg">Google OAuth</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="Client ID"
                                placeholder="xxxxx.apps.googleusercontent.com"
                                value={settings.googleClientId || ''}
                                setValue={v => setSettings(s => ({ ...s, googleClientId: v }))}
                                disabled={isDisabled}
                            />
                            <DynamicText
                                label="Client Secret"
                                type="password"
                                placeholder="GOCSPX-xxxxx"
                                value={settings.googleClientSecret || ''}
                                setValue={v => setSettings(s => ({ ...s, googleClientSecret: v }))}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Apple OAuth */}
            {settings.oauthApple === 'true' && (
                <div className="card bg-base-100 shadow">
                    <div className="card-body">
                        <h3 className="card-title text-lg">Apple OAuth</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="Client ID"
                                placeholder="com.example.app.login"
                                value={settings.appleClientId || ''}
                                setValue={v => setSettings(s => ({ ...s, appleClientId: v }))}
                                disabled={isDisabled}
                            />
                            <DynamicText
                                label="Team ID"
                                placeholder="XXXXXXXXXX"
                                value={settings.appleTeamId || ''}
                                setValue={v => setSettings(s => ({ ...s, appleTeamId: v }))}
                                disabled={isDisabled}
                            />
                            <DynamicText
                                label="Key ID"
                                placeholder="XXXXXXXXXX"
                                value={settings.appleKeyId || ''}
                                setValue={v => setSettings(s => ({ ...s, appleKeyId: v }))}
                                disabled={isDisabled}
                            />
                            <DynamicText
                                label="Private Key"
                                type="password"
                                placeholder="-----BEGIN PRIVATE KEY-----"
                                value={settings.applePrivateKey || ''}
                                setValue={v => setSettings(s => ({ ...s, applePrivateKey: v }))}
                                isTextarea
                                rows={4}
                                className="md:col-span-2"
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Meta OAuth */}
            {settings.oauthMeta === 'true' && (
                <div className="card bg-base-100 shadow">
                    <div className="card-body">
                        <h3 className="card-title text-lg">Meta (Facebook) OAuth</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="Client ID"
                                placeholder="App ID"
                                value={settings.metaClientId || ''}
                                setValue={v => setSettings(s => ({ ...s, metaClientId: v }))}
                                disabled={isDisabled}
                            />
                            <DynamicText
                                label="Client Secret"
                                type="password"
                                placeholder="App Secret"
                                value={settings.metaClientSecret || ''}
                                setValue={v => setSettings(s => ({ ...s, metaClientSecret: v }))}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Autodesk OAuth */}
            {settings.oauthAutodesk === 'true' && (
                <div className="card bg-base-100 shadow">
                    <div className="card-body">
                        <h3 className="card-title text-lg">Autodesk OAuth</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="Client ID"
                                placeholder="Client ID"
                                value={settings.autodeskClientId || ''}
                                setValue={v => setSettings(s => ({ ...s, autodeskClientId: v }))}
                                disabled={isDisabled}
                            />
                            <DynamicText
                                label="Client Secret"
                                type="password"
                                placeholder="Client Secret"
                                value={settings.autodeskClientSecret || ''}
                                setValue={v => setSettings(s => ({ ...s, autodeskClientSecret: v }))}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* GitHub OAuth */}
            {settings.oauthGitHub === 'true' && (
                <div className="card bg-base-100 shadow">
                    <div className="card-body">
                        <h3 className="card-title text-lg">GitHub OAuth</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="Client ID"
                                placeholder="Client ID"
                                value={settings.githubClientId || ''}
                                setValue={v => setSettings(s => ({ ...s, githubClientId: v }))}
                                disabled={isDisabled}
                            />
                            <DynamicText
                                label="Client Secret"
                                type="password"
                                placeholder="Client Secret"
                                value={settings.githubClientSecret || ''}
                                setValue={v => setSettings(s => ({ ...s, githubClientSecret: v }))}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

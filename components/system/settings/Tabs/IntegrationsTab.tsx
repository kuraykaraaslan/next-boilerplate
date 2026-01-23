'use client';

import DynamicText from '@/components/common/forms/DynamicText';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function IntegrationsTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Discord Webhooks</h3>
                    <p className="text-sm text-base-content/60 mb-4">Discord notification configuration</p>

                    <div className="space-y-4">
                        <DynamicText
                            label="Main Webhook URL"
                            type="url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={settings.discordWebhookUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, discordWebhookUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Doorman Webhook URL"
                            type="url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={settings.discordDoormanWebhookUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, discordDoormanWebhookUrl: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">GitHub Widgets</h3>
                    <p className="text-sm text-base-content/60 mb-4">GitHub API configuration for widgets</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="GitHub Username"
                            placeholder="username"
                            value={settings.githubUser || ''}
                            setValue={v => setSettings(s => ({ ...s, githubUser: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="GitHub Token"
                            type="password"
                            placeholder="ghp_..."
                            value={settings.githubToken || ''}
                            setValue={v => setSettings(s => ({ ...s, githubToken: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="GitHub Tree URL"
                            type="url"
                            placeholder="https://api.github.com/repos/user/repo/git/trees/main?recursive=1"
                            value={settings.githubTreeUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, githubTreeUrl: v }))}
                            className="md:col-span-2"
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

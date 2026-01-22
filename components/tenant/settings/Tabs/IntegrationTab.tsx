'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import DynamicToggle from '@/modules/ui/forms/DynamicToggle';
import { TenantSettingsTabProps } from '@/modules/tenant_setting/tenant_setting.types';

export default function IntegrationTab({ settings, setSettings, loading, saving }: TenantSettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Communication</h3>
                    <p className="text-sm text-base-content/60 mb-4">Slack, Discord, and Teams webhooks</p>

                    <div className="grid grid-cols-1 gap-4">
                        <DynamicText
                            label="Slack Webhook URL"
                            type="url"
                            placeholder="https://hooks.slack.com/services/..."
                            value={settings.slackWebhookUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, slackWebhookUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Discord Webhook URL"
                            type="url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={settings.discordWebhookUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, discordWebhookUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Microsoft Teams Webhook URL"
                            type="url"
                            placeholder="https://outlook.office.com/webhook/..."
                            value={settings.teamsWebhookUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, teamsWebhookUrl: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Jira Integration</h3>
                    <p className="text-sm text-base-content/60 mb-4">Connect with Jira for issue tracking</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicToggle
                            label="Enable Jira"
                            description="Connect with Jira"
                            checked={settings.jiraEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, jiraEnabled: String(v) }))}
                            disabled={isDisabled}
                        />

                        {settings.jiraEnabled === 'true' && (
                            <>
                                <DynamicText
                                    label="Jira URL"
                                    type="url"
                                    placeholder="https://your-domain.atlassian.net"
                                    value={settings.jiraUrl || ''}
                                    setValue={v => setSettings(s => ({ ...s, jiraUrl: v }))}
                                    disabled={isDisabled}
                                />

                                <DynamicText
                                    label="Jira API Token"
                                    type="password"
                                    placeholder="Your Jira API token"
                                    value={settings.jiraApiToken || ''}
                                    setValue={v => setSettings(s => ({ ...s, jiraApiToken: v }))}
                                    disabled={isDisabled}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">GitHub Integration</h3>
                    <p className="text-sm text-base-content/60 mb-4">Connect with GitHub for version control</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicToggle
                            label="Enable GitHub"
                            description="Connect with GitHub"
                            checked={settings.githubEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, githubEnabled: String(v) }))}
                            disabled={isDisabled}
                        />

                        {settings.githubEnabled === 'true' && (
                            <DynamicText
                                label="GitHub Token"
                                type="password"
                                placeholder="ghp_..."
                                value={settings.githubToken || ''}
                                setValue={v => setSettings(s => ({ ...s, githubToken: v }))}
                                disabled={isDisabled}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Google Calendar Integration</h3>
                    <p className="text-sm text-base-content/60 mb-4">Sync with Google Calendar</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicToggle
                            label="Enable Google Calendar"
                            description="Sync events with Google Calendar"
                            checked={settings.googleCalendarEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, googleCalendarEnabled: String(v) }))}
                            disabled={isDisabled}
                        />

                        {settings.googleCalendarEnabled === 'true' && (
                            <DynamicText
                                label="Calendar ID"
                                placeholder="your-calendar-id@group.calendar.google.com"
                                value={settings.googleCalendarId || ''}
                                setValue={v => setSettings(s => ({ ...s, googleCalendarId: v }))}
                                disabled={isDisabled}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

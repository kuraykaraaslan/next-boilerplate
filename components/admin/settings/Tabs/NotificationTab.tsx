'use client';

import DynamicText from '@/components/common/forms/DynamicText';
import DynamicToggle from '@/components/common/forms/DynamicToggle';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function NotificationTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            {/* Admin Notifications */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Admin Notifications</h3>
                    <p className="text-sm text-base-content/60 mb-4">Email address for admin notifications</p>

                    <DynamicText
                        label="Admin Notification Email"
                        type="email"
                        placeholder="admin@example.com"
                        value={settings.adminNotificationEmail || ''}
                        setValue={v => setSettings(s => ({ ...s, adminNotificationEmail: v }))}
                        disabled={isDisabled}
                    />
                </div>
            </div>

            {/* Email Notification Triggers */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Email Triggers</h3>
                    <p className="text-sm text-base-content/60 mb-4">When to send email notifications to admin</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicToggle
                            label="New User Registration"
                            checked={settings.emailOnNewUser === 'true'}
                            onChange={v => setSettings(s => ({ ...s, emailOnNewUser: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="New Comment"
                            checked={settings.emailOnNewComment === 'true'}
                            onChange={v => setSettings(s => ({ ...s, emailOnNewComment: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="New Order"
                            checked={settings.emailOnNewOrder === 'true'}
                            onChange={v => setSettings(s => ({ ...s, emailOnNewOrder: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="New Contact Form"
                            checked={settings.emailOnNewContact === 'true'}
                            onChange={v => setSettings(s => ({ ...s, emailOnNewContact: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            {/* Push Notifications */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="card-title text-lg">Push Notifications</h3>
                            <p className="text-sm text-base-content/60">Web push notifications via VAPID</p>
                        </div>
                        <DynamicToggle
                            label=""
                            checked={settings.pushNotificationsEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, pushNotificationsEnabled: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>

                    {settings.pushNotificationsEnabled === 'true' && (
                        <div className="grid grid-cols-1 gap-4">
                            <DynamicText
                                label="VAPID Public Key"
                                placeholder="BNq..."
                                value={settings.vapidPublicKey || ''}
                                setValue={v => setSettings(s => ({ ...s, vapidPublicKey: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="VAPID Private Key"
                                type="password"
                                placeholder="Your VAPID private key"
                                value={settings.vapidPrivateKey || ''}
                                setValue={v => setSettings(s => ({ ...s, vapidPrivateKey: v }))}
                                disabled={isDisabled}
                            />

                            <p className="text-xs text-base-content/60">
                                Generate VAPID keys at <a href="https://vapidkeys.com" target="_blank" rel="noopener noreferrer" className="link link-primary">vapidkeys.com</a>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Slack */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="card-title text-lg">Slack Integration</h3>
                            <p className="text-sm text-base-content/60">Send notifications to Slack channel</p>
                        </div>
                        <DynamicToggle
                            label=""
                            checked={settings.slackNotificationsEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, slackNotificationsEnabled: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>

                    {settings.slackNotificationsEnabled === 'true' && (
                        <DynamicText
                            label="Webhook URL"
                            type="url"
                            placeholder="https://hooks.slack.com/services/..."
                            value={settings.slackWebhookUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, slackWebhookUrl: v }))}
                            disabled={isDisabled}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

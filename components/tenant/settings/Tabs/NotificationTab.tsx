'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import DynamicToggle from '@/modules/ui/forms/DynamicToggle';
import { TenantSettingsTabProps } from '@/modules/tenant_setting/tenant_setting.types';

export default function NotificationTab({ settings, setSettings, loading, saving }: TenantSettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Notification Channels</h3>
                    <p className="text-sm text-base-content/60 mb-4">Configure notification delivery methods</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DynamicToggle
                            label="Email Notifications"
                            description="Send notifications via email"
                            checked={settings.emailNotifications === 'true'}
                            onChange={v => setSettings(s => ({ ...s, emailNotifications: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Push Notifications"
                            description="Send browser push notifications"
                            checked={settings.pushNotifications === 'true'}
                            onChange={v => setSettings(s => ({ ...s, pushNotifications: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="SMS Notifications"
                            description="Send notifications via SMS"
                            checked={settings.smsNotifications === 'true'}
                            onChange={v => setSettings(s => ({ ...s, smsNotifications: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Notification Events</h3>
                    <p className="text-sm text-base-content/60 mb-4">Choose which events trigger notifications</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DynamicToggle
                            label="New Member"
                            description="Notify when a new member joins"
                            checked={settings.notifyOnNewMember === 'true'}
                            onChange={v => setSettings(s => ({ ...s, notifyOnNewMember: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Member Left"
                            description="Notify when a member leaves"
                            checked={settings.notifyOnMemberLeft === 'true'}
                            onChange={v => setSettings(s => ({ ...s, notifyOnMemberLeft: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Role Change"
                            description="Notify when member role changes"
                            checked={settings.notifyOnRoleChange === 'true'}
                            onChange={v => setSettings(s => ({ ...s, notifyOnRoleChange: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Notification Schedule</h3>
                    <p className="text-sm text-base-content/60 mb-4">Configure notification timing</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DynamicText
                            label="Digest Frequency"
                            placeholder="daily"
                            value={settings.digestFrequency || ''}
                            setValue={v => setSettings(s => ({ ...s, digestFrequency: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Quiet Hours Start"
                            placeholder="22:00"
                            value={settings.quietHoursStart || ''}
                            setValue={v => setSettings(s => ({ ...s, quietHoursStart: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Quiet Hours End"
                            placeholder="08:00"
                            value={settings.quietHoursEnd || ''}
                            setValue={v => setSettings(s => ({ ...s, quietHoursEnd: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

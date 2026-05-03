'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import DynamicSelect from '@/modules/ui/forms/DynamicSelect';
import DynamicToggle from '@/modules/ui/forms/DynamicToggle';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function SmsTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">SMS Provider</h3>
                    <p className="text-sm text-base-content/60 mb-4">Select and configure SMS provider</p>

                    <div className="space-y-4">
                        <DynamicSelect
                            label="Provider"
                            selectedValue={settings.smsProvider || ''}
                            onValueChange={v => setSettings(s => ({ ...s, smsProvider: v }))}
                            options={[
                                { value: '', label: 'Select Provider' },
                                { value: 'twilio', label: 'Twilio' },
                                { value: 'netgsm', label: 'NetGSM' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Enable SMS"
                            description="Enable SMS notifications and OTP"
                            checked={settings.smsEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, smsEnabled: v ? 'true' : 'false' }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            {/* Twilio Configuration */}
            {settings.smsProvider === 'twilio' && (
                <div className="card bg-base-100 shadow">
                    <div className="card-body">
                        <h3 className="card-title text-lg">Twilio Configuration</h3>
                        <p className="text-sm text-base-content/60 mb-4">Twilio API credentials</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="Account SID"
                                type="password"
                                placeholder="SKxxxxx..."
                                value={settings.twilioAccountSid || ''}
                                setValue={v => setSettings(s => ({ ...s, twilioAccountSid: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Auth Token"
                                type="password"
                                placeholder="********"
                                value={settings.twilioAuthToken || ''}
                                setValue={v => setSettings(s => ({ ...s, twilioAuthToken: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Phone Number"
                                type="tel"
                                placeholder="+1234567890"
                                value={settings.twilioPhoneNumber || ''}
                                setValue={v => setSettings(s => ({ ...s, twilioPhoneNumber: v }))}
                                disabled={isDisabled}
                            />
                        </div>

                        <div className="mt-4">
                            <button className="btn btn-outline btn-sm" disabled={isDisabled}>
                                Send Test SMS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NetGSM Configuration */}
            {settings.smsProvider === 'netgsm' && (
                <div className="card bg-base-100 shadow">
                    <div className="card-body">
                        <h3 className="card-title text-lg">NetGSM Configuration</h3>
                        <p className="text-sm text-base-content/60 mb-4">NetGSM API credentials</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="User Code"
                                placeholder="5459223554"
                                value={settings.netgsmUserCode || ''}
                                setValue={v => setSettings(s => ({ ...s, netgsmUserCode: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Password"
                                type="password"
                                placeholder="********"
                                value={settings.netgsmPassword || ''}
                                setValue={v => setSettings(s => ({ ...s, netgsmPassword: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Phone Number / Header"
                                placeholder="02323320765"
                                value={settings.netgsmPhoneNumber || ''}
                                setValue={v => setSettings(s => ({ ...s, netgsmPhoneNumber: v }))}
                                disabled={isDisabled}
                            />
                        </div>

                        <div className="mt-4">
                            <button className="btn btn-outline btn-sm" disabled={isDisabled}>
                                Send Test SMS
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

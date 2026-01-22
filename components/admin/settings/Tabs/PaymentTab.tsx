'use client';

import DynamicText from '@/components/admin/UI/Forms/DynamicText';
import DynamicToggle from '@/components/admin/UI/Forms/DynamicToggle';
import DynamicSelect from '@/components/admin/UI/Forms/DynamicSelect';
import { SettingsTabProps } from '@/types/common/SettingTypes';

export default function PaymentTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            {/* General Payment Settings */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">General Settings</h3>
                    <p className="text-sm text-base-content/60 mb-4">Currency and tax configuration</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DynamicSelect
                            label="Currency"
                            selectedValue={settings.currency || 'USD'}
                            onValueChange={v => setSettings(s => ({ ...s, currency: v }))}
                            options={[
                                { value: 'USD', label: 'USD - US Dollar' },
                                { value: 'EUR', label: 'EUR - Euro' },
                                { value: 'GBP', label: 'GBP - British Pound' },
                                { value: 'TRY', label: 'TRY - Turkish Lira' },
                                { value: 'JPY', label: 'JPY - Japanese Yen' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Tax Enabled"
                            checked={settings.taxEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, taxEnabled: String(v) }))}
                            disabled={isDisabled}
                        />

                        {settings.taxEnabled === 'true' && (
                            <DynamicText
                                label="Tax Rate (%)"
                                type="number"
                                placeholder="18"
                                value={settings.taxRate || ''}
                                setValue={v => setSettings(s => ({ ...s, taxRate: v }))}
                                disabled={isDisabled}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Stripe */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="card-title text-lg">Stripe</h3>
                            <p className="text-sm text-base-content/60">Accept credit card payments</p>
                        </div>
                        <DynamicToggle
                            label=""
                            checked={settings.stripeEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, stripeEnabled: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>

                    {settings.stripeEnabled === 'true' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="Public Key"
                                placeholder="pk_live_..."
                                value={settings.stripePublicKey || ''}
                                setValue={v => setSettings(s => ({ ...s, stripePublicKey: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Secret Key"
                                type="password"
                                placeholder="sk_live_..."
                                value={settings.stripeSecretKey || ''}
                                setValue={v => setSettings(s => ({ ...s, stripeSecretKey: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Webhook Secret"
                                type="password"
                                placeholder="whsec_..."
                                value={settings.stripeWebhookSecret || ''}
                                setValue={v => setSettings(s => ({ ...s, stripeWebhookSecret: v }))}
                                disabled={isDisabled}
                                className="md:col-span-2"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* PayPal */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="card-title text-lg">PayPal</h3>
                            <p className="text-sm text-base-content/60">Accept PayPal payments</p>
                        </div>
                        <DynamicToggle
                            label=""
                            checked={settings.paypalEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, paypalEnabled: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>

                    {settings.paypalEnabled === 'true' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="Client ID"
                                placeholder="PayPal Client ID"
                                value={settings.paypalClientId || ''}
                                setValue={v => setSettings(s => ({ ...s, paypalClientId: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Client Secret"
                                type="password"
                                placeholder="PayPal Client Secret"
                                value={settings.paypalClientSecret || ''}
                                setValue={v => setSettings(s => ({ ...s, paypalClientSecret: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicToggle
                                label="Sandbox Mode"
                                checked={settings.paypalSandboxMode === 'true'}
                                onChange={v => setSettings(s => ({ ...s, paypalSandboxMode: String(v) }))}
                                disabled={isDisabled}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* iyzico */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="card-title text-lg">iyzico</h3>
                            <p className="text-sm text-base-content/60">Turkish payment gateway</p>
                        </div>
                        <DynamicToggle
                            label=""
                            checked={settings.iyzicoEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, iyzicoEnabled: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>

                    {settings.iyzicoEnabled === 'true' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DynamicText
                                label="API Key"
                                placeholder="iyzico API Key"
                                value={settings.iyzicoApiKey || ''}
                                setValue={v => setSettings(s => ({ ...s, iyzicoApiKey: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Secret Key"
                                type="password"
                                placeholder="iyzico Secret Key"
                                value={settings.iyzicoSecretKey || ''}
                                setValue={v => setSettings(s => ({ ...s, iyzicoSecretKey: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicToggle
                                label="Sandbox Mode"
                                checked={settings.iyzicoSandboxMode === 'true'}
                                onChange={v => setSettings(s => ({ ...s, iyzicoSandboxMode: String(v) }))}
                                disabled={isDisabled}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

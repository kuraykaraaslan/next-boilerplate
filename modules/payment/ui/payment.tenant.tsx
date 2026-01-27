'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function BillingTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Billing Contact</h3>
                    <p className="text-sm text-base-content/60 mb-4">Contact information for billing</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Billing Name"
                            placeholder="John Doe"
                            value={settings.billingName || ''}
                            setValue={v => setSettings(s => ({ ...s, billingName: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Billing Email"
                            type="email"
                            placeholder="billing@company.com"
                            value={settings.billingEmail || ''}
                            setValue={v => setSettings(s => ({ ...s, billingEmail: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Billing Address"
                            placeholder="123 Main St, City, Country"
                            value={settings.billingAddress || ''}
                            setValue={v => setSettings(s => ({ ...s, billingAddress: v }))}
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
                    <h3 className="card-title text-lg">Tax Information</h3>
                    <p className="text-sm text-base-content/60 mb-4">Tax identification details</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Tax ID"
                            placeholder="XX-XXXXXXX"
                            value={settings.taxId || ''}
                            setValue={v => setSettings(s => ({ ...s, taxId: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="VAT Number"
                            placeholder="XXXXXXXXXXXX"
                            value={settings.vatNumber || ''}
                            setValue={v => setSettings(s => ({ ...s, vatNumber: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Invoice Settings</h3>
                    <p className="text-sm text-base-content/60 mb-4">Customize invoice appearance</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Currency"
                            placeholder="USD"
                            value={settings.currency || ''}
                            setValue={v => setSettings(s => ({ ...s, currency: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Invoice Prefix"
                            placeholder="INV-"
                            value={settings.invoicePrefix || ''}
                            setValue={v => setSettings(s => ({ ...s, invoicePrefix: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Invoice Footer"
                            placeholder="Thank you for your business!"
                            value={settings.invoiceFooter || ''}
                            setValue={v => setSettings(s => ({ ...s, invoiceFooter: v }))}
                            isTextarea
                            rows={2}
                            className="md:col-span-2"
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

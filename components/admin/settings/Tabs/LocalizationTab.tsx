'use client';

import DynamicText from '@/components/admin/UI/Forms/DynamicText';
import DynamicSelect from '@/components/admin/UI/Forms/DynamicSelect';
import { SettingsTabProps } from '@/types/common/SettingTypes';

export default function LocalizationTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            {/* Language & Timezone */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Language & Region</h3>
                    <p className="text-sm text-base-content/60 mb-4">Default language and timezone settings</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicSelect
                            label="Default Language"
                            selectedValue={settings.defaultLanguage || 'en'}
                            onValueChange={v => setSettings(s => ({ ...s, defaultLanguage: v }))}
                            options={[
                                { value: 'en', label: 'English' },
                                { value: 'tr', label: 'Türkçe' },
                                { value: 'de', label: 'Deutsch' },
                                { value: 'es', label: 'Español' },
                                { value: 'fr', label: 'Français' },
                                { value: 'nl', label: 'Nederlands' },
                                { value: 'gr', label: 'Ελληνικά' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Default Timezone"
                            selectedValue={settings.defaultTimezone || 'UTC'}
                            onValueChange={v => setSettings(s => ({ ...s, defaultTimezone: v }))}
                            options={[
                                { value: 'UTC', label: 'UTC' },
                                { value: 'Europe/Istanbul', label: 'Europe/Istanbul (GMT+3)' },
                                { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
                                { value: 'Europe/Berlin', label: 'Europe/Berlin (GMT+1)' },
                                { value: 'Europe/Paris', label: 'Europe/Paris (GMT+1)' },
                                { value: 'America/New_York', label: 'America/New_York (GMT-5)' },
                                { value: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8)' },
                                { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
                                { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
                            ]}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            {/* Date & Time Format */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Date & Time Format</h3>
                    <p className="text-sm text-base-content/60 mb-4">How dates and times are displayed</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicSelect
                            label="Date Format"
                            selectedValue={settings.dateFormat || 'DD/MM/YYYY'}
                            onValueChange={v => setSettings(s => ({ ...s, dateFormat: v }))}
                            options={[
                                { value: 'DD/MM/YYYY', label: '31/12/2026 (DD/MM/YYYY)' },
                                { value: 'MM/DD/YYYY', label: '12/31/2026 (MM/DD/YYYY)' },
                                { value: 'YYYY-MM-DD', label: '2026-12-31 (YYYY-MM-DD)' },
                                { value: 'DD.MM.YYYY', label: '31.12.2026 (DD.MM.YYYY)' },
                                { value: 'DD MMM YYYY', label: '31 Dec 2026 (DD MMM YYYY)' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Time Format"
                            selectedValue={settings.timeFormat || '24h'}
                            onValueChange={v => setSettings(s => ({ ...s, timeFormat: v }))}
                            options={[
                                { value: '24h', label: '24-hour (14:30)' },
                                { value: '12h', label: '12-hour (2:30 PM)' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="DateTime Format"
                            placeholder="DD/MM/YYYY HH:mm"
                            value={settings.datetimeFormat || ''}
                            setValue={v => setSettings(s => ({ ...s, datetimeFormat: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Week Starts On"
                            selectedValue={settings.weekStartsOn || 'monday'}
                            onValueChange={v => setSettings(s => ({ ...s, weekStartsOn: v }))}
                            options={[
                                { value: 'monday', label: 'Monday' },
                                { value: 'sunday', label: 'Sunday' },
                                { value: 'saturday', label: 'Saturday' },
                            ]}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            {/* Number & Currency Format */}
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Number & Currency Format</h3>
                    <p className="text-sm text-base-content/60 mb-4">How numbers and currency are displayed</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Currency Symbol"
                            placeholder="$"
                            value={settings.currencySymbol || ''}
                            setValue={v => setSettings(s => ({ ...s, currencySymbol: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Currency Position"
                            selectedValue={settings.currencyPosition || 'before'}
                            onValueChange={v => setSettings(s => ({ ...s, currencyPosition: v }))}
                            options={[
                                { value: 'before', label: 'Before ($100)' },
                                { value: 'after', label: 'After (100$)' },
                                { value: 'before_space', label: 'Before with space ($ 100)' },
                                { value: 'after_space', label: 'After with space (100 $)' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Thousand Separator"
                            selectedValue={settings.thousandSeparator || ','}
                            onValueChange={v => setSettings(s => ({ ...s, thousandSeparator: v }))}
                            options={[
                                { value: ',', label: 'Comma (1,000,000)' },
                                { value: '.', label: 'Dot (1.000.000)' },
                                { value: ' ', label: 'Space (1 000 000)' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Decimal Separator"
                            selectedValue={settings.decimalSeparator || '.'}
                            onValueChange={v => setSettings(s => ({ ...s, decimalSeparator: v }))}
                            options={[
                                { value: '.', label: 'Dot (99.99)' },
                                { value: ',', label: 'Comma (99,99)' },
                            ]}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

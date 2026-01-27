'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function AnalyticsTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Google Analytics</h3>
                    <p className="text-sm text-base-content/60 mb-4">Configure Google Analytics tracking</p>

                    <div className="grid grid-cols-1 gap-4">
                        <DynamicText
                            label="Google Tag ID"
                            placeholder="G-XXXXXXXXXX"
                            value={settings.googleTagId || ''}
                            setValue={v => setSettings(s => ({ ...s, googleTagId: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

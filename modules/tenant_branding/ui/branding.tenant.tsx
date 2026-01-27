'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function BrandingTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Brand Identity</h3>
                    <p className="text-sm text-base-content/60 mb-4">Your organization's brand information</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Brand Name"
                            placeholder="My Brand"
                            value={settings.brandName || ''}
                            setValue={v => setSettings(s => ({ ...s, brandName: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Brand Tagline"
                            placeholder="Innovation at its finest"
                            value={settings.brandTagline || ''}
                            setValue={v => setSettings(s => ({ ...s, brandTagline: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Logos</h3>
                    <p className="text-sm text-base-content/60 mb-4">Brand logos for different themes</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Logo (Light Theme)"
                            type="url"
                            placeholder="https://example.com/logo-light.png"
                            value={settings.brandLogoLight || ''}
                            setValue={v => setSettings(s => ({ ...s, brandLogoLight: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Logo (Dark Theme)"
                            type="url"
                            placeholder="https://example.com/logo-dark.png"
                            value={settings.brandLogoDark || ''}
                            setValue={v => setSettings(s => ({ ...s, brandLogoDark: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Favicon"
                            type="url"
                            placeholder="https://example.com/favicon.ico"
                            value={settings.brandFavicon || ''}
                            setValue={v => setSettings(s => ({ ...s, brandFavicon: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Colors</h3>
                    <p className="text-sm text-base-content/60 mb-4">Brand color scheme</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Primary Color"
                            placeholder="#3B82F6"
                            value={settings.brandPrimaryColor || ''}
                            setValue={v => setSettings(s => ({ ...s, brandPrimaryColor: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Secondary Color"
                            placeholder="#10B981"
                            value={settings.brandSecondaryColor || ''}
                            setValue={v => setSettings(s => ({ ...s, brandSecondaryColor: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Custom Code</h3>
                    <p className="text-sm text-base-content/60 mb-4">Custom CSS and JavaScript</p>

                    <div className="grid grid-cols-1 gap-4">
                        <DynamicText
                            label="Custom CSS"
                            placeholder=".my-class { color: red; }"
                            value={settings.customCss || ''}
                            setValue={v => setSettings(s => ({ ...s, customCss: v }))}
                            isTextarea
                            rows={4}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Custom JavaScript"
                            placeholder="console.log('Hello');"
                            value={settings.customJs || ''}
                            setValue={v => setSettings(s => ({ ...s, customJs: v }))}
                            isTextarea
                            rows={4}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

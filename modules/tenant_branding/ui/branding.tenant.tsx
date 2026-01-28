'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import ImageLoad from '@/modules/ui/forms/ImageLoad';
import { SettingsTabProps } from '@/modules/setting/setting.types';
import { toast } from 'react-toastify';

export default function BrandingTab({ settings, setSettings, loading, saving, tenantId }: SettingsTabProps & { tenantId?: string }) {
    const isDisabled = loading || saving;
    // tenantId prop'u gelirse tenant context'inde çalışıyoruz
    const apiPath = tenantId ? `/tenant/${tenantId}/api/storage` : '/system/api/storage';

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
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Logo (Light Theme)</span>
                            </label>
                            <ImageLoad
                                image={settings.brandLogoLight || ''}
                                setImage={v => setSettings(s => ({ ...s, brandLogoLight: v }))}
                                uploadFolder="branding/logos"
                                toast={toast}
                                aspect={3 / 1}
                                width={288}
                                height={96}
                                outputWidth={600}
                                outputHeight={200}
                                apiPath={apiPath}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Logo (Dark Theme)</span>
                            </label>
                            <ImageLoad
                                image={settings.brandLogoDark || ''}
                                setImage={v => setSettings(s => ({ ...s, brandLogoDark: v }))}
                                uploadFolder="branding/logos"
                                toast={toast}
                                aspect={3 / 1}
                                width={288}
                                height={96}
                                outputWidth={600}
                                outputHeight={200}
                                apiPath={apiPath}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Favicon</span>
                            </label>
                            <ImageLoad
                                image={settings.brandFavicon || ''}
                                setImage={v => setSettings(s => ({ ...s, brandFavicon: v }))}
                                uploadFolder="branding/favicon"
                                toast={toast}
                                aspect={1}
                                width={64}
                                height={64}
                                outputWidth={128}
                                outputHeight={128}
                                apiPath={apiPath}
                            />
                        </div>

                        <div className="form-control md:col-span-2">
                            <label className="label">
                                <span className="label-text font-medium">Auth Wallpaper</span>
                            </label>
                            <ImageLoad
                                image={settings.authWallpaper || ''}
                                setImage={v => setSettings(s => ({ ...s, authWallpaper: v }))}
                                uploadFolder="branding/wallpapers"
                                toast={toast}
                                aspect={16 / 9}
                                width={576}
                                height={324}
                                outputWidth={1920}
                                outputHeight={1080}
                                apiPath={apiPath}
                            />
                        </div>
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

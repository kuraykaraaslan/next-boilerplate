'use client';

import DynamicText from '@/components/admin/UI/Forms/DynamicText';
import DynamicToggle from '@/components/admin/UI/Forms/DynamicToggle';
import DynamicSelect from '@/components/admin/UI/Forms/DynamicSelect';
import { SettingsTabProps } from '@/types/common/SettingTypes';

export default function SeoTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Search Engine Settings</h3>
                    <p className="text-sm text-base-content/60 mb-4">Control how search engines index your site</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicSelect
                            label="Meta Robots"
                            selectedValue={settings.metaRobots || 'index,follow'}
                            onValueChange={v => setSettings(s => ({ ...s, metaRobots: v }))}
                            options={[
                                { value: 'index,follow', label: 'Index, Follow (Recommended)' },
                                { value: 'index,nofollow', label: 'Index, No Follow' },
                                { value: 'noindex,follow', label: 'No Index, Follow' },
                                { value: 'noindex,nofollow', label: 'No Index, No Follow' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Twitter Card Type"
                            selectedValue={settings.twitterCardType || 'summary_large_image'}
                            onValueChange={v => setSettings(s => ({ ...s, twitterCardType: v }))}
                            options={[
                                { value: 'summary', label: 'Summary' },
                                { value: 'summary_large_image', label: 'Summary Large Image' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Enable Sitemap"
                            checked={settings.sitemapEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, sitemapEnabled: String(v) }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="Enable Canonical URLs"
                            checked={settings.canonicalEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, canonicalEnabled: String(v) }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Open Graph</h3>
                    <p className="text-sm text-base-content/60 mb-4">Default social sharing image</p>

                    <DynamicText
                        label="Default OG Image URL"
                        type="url"
                        placeholder="https://example.com/og-image.jpg"
                        value={settings.ogDefaultImage || ''}
                        setValue={v => setSettings(s => ({ ...s, ogDefaultImage: v }))}
                        disabled={isDisabled}
                    />
                    <p className="text-xs text-base-content/60 mt-1">
                        Recommended size: 1200x630 pixels
                    </p>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Webmaster Tools</h3>
                    <p className="text-sm text-base-content/60 mb-4">Verification IDs for search console</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Google Search Console ID"
                            placeholder="Verification meta tag content"
                            value={settings.googleSearchConsoleId || ''}
                            setValue={v => setSettings(s => ({ ...s, googleSearchConsoleId: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Bing Webmaster ID"
                            placeholder="Verification meta tag content"
                            value={settings.bingWebmasterId || ''}
                            setValue={v => setSettings(s => ({ ...s, bingWebmasterId: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import DynamicText from '@/components/common/forms/DynamicText';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function SocialTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Social Media Profiles</h3>
                    <p className="text-sm text-base-content/60 mb-4">Your social media profile URLs</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Facebook"
                            type="url"
                            placeholder="https://facebook.com/yourpage"
                            value={settings.facebookUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, facebookUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Twitter / X"
                            type="url"
                            placeholder="https://twitter.com/yourhandle"
                            value={settings.twitterUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, twitterUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Instagram"
                            type="url"
                            placeholder="https://instagram.com/yourhandle"
                            value={settings.instagramUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, instagramUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="LinkedIn"
                            type="url"
                            placeholder="https://linkedin.com/in/yourprofile"
                            value={settings.linkedinUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, linkedinUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="YouTube"
                            type="url"
                            placeholder="https://youtube.com/@yourchannel"
                            value={settings.youtubeUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, youtubeUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="GitHub"
                            type="url"
                            placeholder="https://github.com/yourusername"
                            value={settings.githubProfileUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, githubProfileUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="TikTok"
                            type="url"
                            placeholder="https://tiktok.com/@yourhandle"
                            value={settings.tiktokUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, tiktokUrl: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Pinterest"
                            type="url"
                            placeholder="https://pinterest.com/yourprofile"
                            value={settings.pinterestUrl || ''}
                            setValue={v => setSettings(s => ({ ...s, pinterestUrl: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import DynamicText from '@/components/common/forms/DynamicText';
import DynamicToggle from '@/components/common/forms/DynamicToggle';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function SecurityTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Rate Limiting</h3>
                    <p className="text-sm text-base-content/60 mb-4">API rate limit configuration</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Requests per Minute"
                            type="number"
                            placeholder="60"
                            value={settings.rateLimitPerMinute || ''}
                            setValue={v => setSettings(s => ({ ...s, rateLimitPerMinute: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Requests per Hour"
                            type="number"
                            placeholder="1000"
                            value={settings.rateLimitPerHour || ''}
                            setValue={v => setSettings(s => ({ ...s, rateLimitPerHour: v }))}
                            disabled={isDisabled}
                        />
                    </div>

                    <DynamicToggle
                        label="Enable Rate Limiting"
                        description="Protect API from abuse"
                        checked={settings.rateLimitEnabled === 'true'}
                        onChange={v => setSettings(s => ({ ...s, rateLimitEnabled: v ? 'true' : 'false' }))}
                        className="mt-4"
                        disabled={isDisabled}
                    />
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">reCAPTCHA</h3>
                    <p className="text-sm text-base-content/60 mb-4">Google reCAPTCHA protection</p>

                    <DynamicToggle
                        label="Enable reCAPTCHA"
                        description="Protect forms from bots"
                        checked={settings.recaptchaEnabled === 'true'}
                        onChange={v => setSettings(s => ({ ...s, recaptchaEnabled: v ? 'true' : 'false' }))}
                        disabled={isDisabled}
                    />

                    {settings.recaptchaEnabled === 'true' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <DynamicText
                                label="Client Key (Site Key)"
                                placeholder="6Lcxxxxx..."
                                value={settings.recaptchaClientKey || ''}
                                setValue={v => setSettings(s => ({ ...s, recaptchaClientKey: v }))}
                                disabled={isDisabled}
                            />

                            <DynamicText
                                label="Server Key (Secret Key)"
                                type="password"
                                placeholder="6Lcxxxxx..."
                                value={settings.recaptchaServerKey || ''}
                                setValue={v => setSettings(s => ({ ...s, recaptchaServerKey: v }))}
                                disabled={isDisabled}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">MaxMind GeoIP</h3>
                    <p className="text-sm text-base-content/60 mb-4">IP geolocation service</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="Account ID"
                            placeholder="123456"
                            value={settings.maxmindAccountId || ''}
                            setValue={v => setSettings(s => ({ ...s, maxmindAccountId: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="API Key"
                            type="password"
                            placeholder="xxxxx..."
                            value={settings.maxmindApiKey || ''}
                            setValue={v => setSettings(s => ({ ...s, maxmindApiKey: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">CORS Settings</h3>
                    <p className="text-sm text-base-content/60 mb-4">Cross-origin resource sharing</p>

                    <DynamicText
                        label="Allowed Origins"
                        placeholder="https://example.com&#10;https://app.example.com"
                        value={settings.corsAllowedOrigins || ''}
                        setValue={v => setSettings(s => ({ ...s, corsAllowedOrigins: v }))}
                        isTextarea
                        rows={3}
                        disabled={isDisabled}
                    />
                    <p className="text-xs text-base-content/60 mt-1">
                        One origin per line. Use * for all origins.
                    </p>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Security Headers</h3>
                    <p className="text-sm text-base-content/60 mb-4">HTTP security headers</p>

                    <div className="space-y-4">
                        <DynamicToggle
                            label="Strict-Transport-Security"
                            description="Force HTTPS connections"
                            checked={settings.hstsEnabled === 'true'}
                            onChange={v => setSettings(s => ({ ...s, hstsEnabled: v ? 'true' : 'false' }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="X-Content-Type-Options"
                            description="Prevent MIME type sniffing"
                            checked={settings.xContentTypeOptions === 'true'}
                            onChange={v => setSettings(s => ({ ...s, xContentTypeOptions: v ? 'true' : 'false' }))}
                            disabled={isDisabled}
                        />

                        <DynamicToggle
                            label="X-Frame-Options"
                            description="Prevent clickjacking attacks"
                            checked={settings.xFrameOptions === 'true'}
                            onChange={v => setSettings(s => ({ ...s, xFrameOptions: v ? 'true' : 'false' }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">IP Blocking</h3>
                    <p className="text-sm text-base-content/60 mb-4">Block specific IP addresses</p>

                    <DynamicText
                        label="Blocked IPs"
                        placeholder="192.168.1.1&#10;10.0.0.0/8"
                        value={settings.blockedIps || ''}
                        setValue={v => setSettings(s => ({ ...s, blockedIps: v }))}
                        isTextarea
                        rows={3}
                        disabled={isDisabled}
                    />
                    <p className="text-xs text-base-content/60 mt-1">
                        One IP or CIDR range per line
                    </p>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Cron Configuration</h3>
                    <p className="text-sm text-base-content/60 mb-4">Scheduled task security</p>

                    <DynamicText
                        label="Cron Secret"
                        type="password"
                        placeholder="your-cron-secret"
                        value={settings.cronSecret || ''}
                        setValue={v => setSettings(s => ({ ...s, cronSecret: v }))}
                        disabled={isDisabled}
                    />
                </div>
            </div>
        </div>
    );
}

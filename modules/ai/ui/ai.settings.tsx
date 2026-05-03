'use client';

import DynamicText from '@/modules/ui/forms/DynamicText';
import DynamicSelect from '@/modules/ui/forms/DynamicSelect';
import DynamicToggle from '@/modules/ui/forms/DynamicToggle';
import { SettingsTabProps } from '@/modules/setting/setting.types';

export default function AITab({ settings, setSettings, loading, saving }: SettingsTabProps) {
    const isDisabled = loading || saving;

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">AI Settings</h3>
                    <p className="text-sm text-base-content/60 mb-4">General AI configuration</p>

                    <DynamicToggle
                        label="Enable AI Features"
                        description="Allow AI-powered translations and content generation"
                        checked={settings.aiEnabled === 'true'}
                        onChange={v => setSettings(s => ({ ...s, aiEnabled: v ? 'true' : 'false' }))}
                        disabled={isDisabled}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <DynamicText
                            label="Daily Request Limit"
                            type="number"
                            placeholder="1000"
                            value={settings.aiDailyLimit || ''}
                            setValue={v => setSettings(s => ({ ...s, aiDailyLimit: v }))}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Monthly Token Budget"
                            type="number"
                            placeholder="1000000"
                            value={settings.aiMonthlyBudget || ''}
                            setValue={v => setSettings(s => ({ ...s, aiMonthlyBudget: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">OpenAI Configuration</h3>
                    <p className="text-sm text-base-content/60 mb-4">GPT and DALL-E settings</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="API Key"
                            type="password"
                            placeholder="sk-proj-..."
                            value={settings.openaiApiKey || ''}
                            setValue={v => setSettings(s => ({ ...s, openaiApiKey: v }))}
                            className="md:col-span-2"
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Default Model"
                            selectedValue={settings.openaiDefaultModel || ''}
                            onValueChange={v => setSettings(s => ({ ...s, openaiDefaultModel: v }))}
                            options={[
                                { value: 'gpt-4o', label: 'GPT-4o' },
                                { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                            ]}
                            disabled={isDisabled}
                        />

                        <DynamicText
                            label="Max Tokens"
                            type="number"
                            placeholder="4096"
                            value={settings.openaiMaxTokens || ''}
                            setValue={v => setSettings(s => ({ ...s, openaiMaxTokens: v }))}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Anthropic Configuration</h3>
                    <p className="text-sm text-base-content/60 mb-4">Claude API settings</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DynamicText
                            label="API Key"
                            type="password"
                            placeholder="sk-ant-..."
                            value={settings.anthropicApiKey || ''}
                            setValue={v => setSettings(s => ({ ...s, anthropicApiKey: v }))}
                            className="md:col-span-2"
                            disabled={isDisabled}
                        />

                        <DynamicSelect
                            label="Default Model"
                            selectedValue={settings.anthropicDefaultModel || ''}
                            onValueChange={v => setSettings(s => ({ ...s, anthropicDefaultModel: v }))}
                            options={[
                                { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
                                { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
                                { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
                                { value: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
                            ]}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">HuggingFace Configuration</h3>
                    <p className="text-sm text-base-content/60 mb-4">HuggingFace API settings</p>

                    <DynamicText
                        label="HuggingFace Token"
                        type="password"
                        placeholder="hf_..."
                        value={settings.huggingfaceToken || ''}
                        setValue={v => setSettings(s => ({ ...s, huggingfaceToken: v }))}
                        disabled={isDisabled}
                    />
                </div>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h3 className="card-title text-lg">Editor Configuration</h3>
                    <p className="text-sm text-base-content/60 mb-4">TinyMCE rich text editor</p>

                    <DynamicText
                        label="TinyMCE API Key"
                        type="password"
                        placeholder="xxxxxxxxxxxxx"
                        value={settings.tinymceApiKey || ''}
                        setValue={v => setSettings(s => ({ ...s, tinymceApiKey: v }))}
                        disabled={isDisabled}
                    />
                </div>
            </div>
        </div>
    );
}

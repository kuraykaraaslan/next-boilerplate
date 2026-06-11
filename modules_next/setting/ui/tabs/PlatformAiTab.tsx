'use client';

import { useState } from 'react';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { Select } from '@/modules_next/common/ui/Select';
import { b, bStr, SaveRow, type SR, type TabProps } from './platform-tab.shared';

const AI_PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
];

export function PlatformAiTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    aiEnabled: b(settings.aiEnabled),
    aiDefaultProvider: settings.aiDefaultProvider ?? 'openai',
    openaiApiKey: settings.openaiApiKey ?? '',
    openaiDefaultModel: settings.openaiDefaultModel ?? 'gpt-4o',
    anthropicApiKey: settings.anthropicApiKey ?? '',
    anthropicDefaultModel: settings.anthropicDefaultModel ?? 'claude-sonnet-4-6',
    googleAiApiKey: settings.googleAiApiKey ?? '',
    googleDefaultModel: settings.googleDefaultModel ?? 'gemini-2.0-flash',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) { setF((p) => ({ ...p, [key]: val })); }
  function buildPatch(): SR { return { ...f, aiEnabled: bStr(f.aiEnabled) }; }

  return (
    <div className="pt-6 space-y-6">
      <Card title="AI Settings">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-5">
          <Toggle id="aiEnabled" label="Enable AI Features"
            checked={f.aiEnabled} onChange={(v) => patch('aiEnabled', v)} />
          {f.aiEnabled && (
            <Select id="aiDefaultProvider" label="Default Provider" options={AI_PROVIDER_OPTIONS}
              value={f.aiDefaultProvider} onChange={(e) => patch('aiDefaultProvider', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>
      {f.aiEnabled && (
        <>
          <Card title="OpenAI">
            <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
              <Input id="openaiApiKey" label="API Key" type="password" value={f.openaiApiKey}
                onChange={(e) => patch('openaiApiKey', e.target.value)} />
              <Input id="openaiModel" label="Default Model" value={f.openaiDefaultModel}
                onChange={(e) => patch('openaiDefaultModel', e.target.value)} />
              <SaveRow loading={saving} />
            </form>
          </Card>
          <Card title="Anthropic">
            <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
              <Input id="anthropicApiKey" label="API Key" type="password" value={f.anthropicApiKey}
                onChange={(e) => patch('anthropicApiKey', e.target.value)} />
              <Input id="anthropicModel" label="Default Model" value={f.anthropicDefaultModel}
                onChange={(e) => patch('anthropicDefaultModel', e.target.value)} />
              <SaveRow loading={saving} />
            </form>
          </Card>
          <Card title="Google Gemini">
            <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
              <Input id="googleAiApiKey" label="API Key" type="password" value={f.googleAiApiKey}
                onChange={(e) => patch('googleAiApiKey', e.target.value)} />
              <Input id="googleModel" label="Default Model" value={f.googleDefaultModel}
                onChange={(e) => patch('googleDefaultModel', e.target.value)} />
              <SaveRow loading={saving} />
            </form>
          </Card>
        </>
      )}
    </div>
  );
}

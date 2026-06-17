'use client';

import { useState } from 'react';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { b, bStr, SaveRow, type SR, type TabProps } from './platform-tab.shared.component';

const AI_PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
];

export function PlatformAiTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    aiEnabled: b(settings.aiEnabled),
    aiDefaultProvider: settings.aiDefaultProvider ?? 'openai',
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
        <Card title="Providers">
          <p className="text-sm text-text-secondary">
            AI providers (OpenAI, Anthropic, Google, Kimi, …) are now sandboxed plugins. Install them and set
            their API keys from <span className="font-medium">Plugins → Configure</span>. Each provider&apos;s
            credentials are stored as encrypted plugin secrets.
          </p>
        </Card>
      )}
    </div>
  );
}

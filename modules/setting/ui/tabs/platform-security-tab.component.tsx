'use client';

import { useState } from 'react';
import { Card } from '@nb/common/ui/card.component';
import { Input } from '@nb/common/ui/input.component';
import { Toggle } from '@nb/common/ui/toggle.component';
import { b, bStr, SaveRow, type SR, type TabProps } from './platform-tab.shared.component';

export function PlatformSecurityTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    rateLimitEnabled: b(settings.rateLimitEnabled),
    rateLimitPerMinute: settings.rateLimitPerMinute ?? '60',
    corsAllowedOrigins: settings.corsAllowedOrigins ?? '',
    hstsEnabled: b(settings.hstsEnabled),
    blockedIps: settings.blockedIps ?? '',
    recaptchaEnabled: b(settings.recaptchaEnabled),
    recaptchaClientKey: settings.recaptchaClientKey ?? '',
    recaptchaServerKey: settings.recaptchaServerKey ?? '',
    cronSecret: settings.cronSecret ?? '',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch(): SR {
    return {
      ...f,
      rateLimitEnabled: bStr(f.rateLimitEnabled),
      hstsEnabled: bStr(f.hstsEnabled),
      recaptchaEnabled: bStr(f.recaptchaEnabled),
    };
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Rate Limiting">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="rateLimitEnabled" label="Enable Rate Limiting"
            checked={f.rateLimitEnabled} onChange={(v) => patch('rateLimitEnabled', v)} />
          {f.rateLimitEnabled && (
            <Input id="rateLimitPerMinute" label="Max Requests / Minute" type="number"
              value={f.rateLimitPerMinute} onChange={(e) => patch('rateLimitPerMinute', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="CORS & Headers">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Input id="corsAllowedOrigins" label="CORS Allowed Origins" value={f.corsAllowedOrigins}
            onChange={(e) => patch('corsAllowedOrigins', e.target.value)} />
          <Toggle id="hstsEnabled" label="Enable HSTS"
            checked={f.hstsEnabled} onChange={(v) => patch('hstsEnabled', v)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="IP Blocking">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ blockedIps: f.blockedIps }); }} className="space-y-4">
          <Input id="blockedIps" label="Blocked IP Addresses" value={f.blockedIps}
            placeholder="192.168.1.1,10.0.0.0/8"
            onChange={(e) => patch('blockedIps', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="reCAPTCHA">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="recaptchaEnabled" label="Enable Google reCAPTCHA v3"
            checked={f.recaptchaEnabled} onChange={(v) => patch('recaptchaEnabled', v)} />
          {f.recaptchaEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
              <Input id="recaptchaClientKey" label="Site Key (Client)" value={f.recaptchaClientKey}
                onChange={(e) => patch('recaptchaClientKey', e.target.value)} />
              <Input id="recaptchaServerKey" label="Secret Key (Server)" type="password"
                value={f.recaptchaServerKey} onChange={(e) => patch('recaptchaServerKey', e.target.value)} />
            </div>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Cron Jobs">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ cronSecret: f.cronSecret }); }} className="space-y-4">
          <Input id="cronSecret" label="Cron Secret" type="password" value={f.cronSecret}
            onChange={(e) => patch('cronSecret', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

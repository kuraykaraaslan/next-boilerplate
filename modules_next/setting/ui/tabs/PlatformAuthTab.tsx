'use client';

import { useState } from 'react';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { b, bStr, SaveRow, type SR, type TabProps } from './platform-tab.shared';

const SSO_PROVIDERS = [
  { key: 'oauthGoogle',    label: 'Google',    idKey: 'googleClientId',    secretKey: 'googleClientSecret' },
  { key: 'oauthGitHub',    label: 'GitHub',    idKey: 'githubClientId',    secretKey: 'githubClientSecret' },
  { key: 'oauthApple',     label: 'Apple',     idKey: 'appleClientId',     secretKey: 'applePrivateKey' },
  { key: 'oauthMeta',      label: 'Meta',      idKey: 'metaClientId',      secretKey: 'metaClientSecret' },
];

export function PlatformAuthTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    allowRegistration: b(settings.allowRegistration),
    emailVerificationRequired: b(settings.emailVerificationRequired),
    sessionDuration: settings.sessionDuration ?? '7',
    maxLoginAttempts: settings.maxLoginAttempts ?? '5',
    googleClientId: settings.googleClientId ?? '',
    googleClientSecret: settings.googleClientSecret ?? '',
    githubClientId: settings.githubClientId ?? '',
    githubClientSecret: settings.githubClientSecret ?? '',
    appleClientId: settings.appleClientId ?? '',
    applePrivateKey: settings.applePrivateKey ?? '',
    metaClientId: settings.metaClientId ?? '',
    metaClientSecret: settings.metaClientSecret ?? '',
    ...Object.fromEntries(SSO_PROVIDERS.map((p) => [p.key, b(settings[p.key])])),
  });

  function patch(key: string, val: string | boolean) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch(): SR {
    const out: SR = {
      allowRegistration: bStr(f.allowRegistration),
      emailVerificationRequired: bStr(f.emailVerificationRequired),
      sessionDuration: f.sessionDuration,
      maxLoginAttempts: f.maxLoginAttempts,
      googleClientId: f.googleClientId,
      googleClientSecret: f.googleClientSecret,
      githubClientId: f.githubClientId,
      githubClientSecret: f.githubClientSecret,
      appleClientId: f.appleClientId,
      applePrivateKey: f.applePrivateKey,
      metaClientId: f.metaClientId,
      metaClientSecret: f.metaClientSecret,
    };
    SSO_PROVIDERS.forEach((p) => { out[p.key] = bStr((f as any)[p.key]); });
    return out;
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Registration & Verification">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-5">
          <Toggle id="allowRegistration" label="Allow Public Registration"
            description="When off, only admins can create new accounts."
            checked={f.allowRegistration} onChange={(v) => patch('allowRegistration', v)} />
          <Toggle id="emailVerificationRequired" label="Require Email Verification"
            description="Users must verify their email before accessing the platform."
            checked={f.emailVerificationRequired} onChange={(v) => patch('emailVerificationRequired', v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="sessionDuration" label="Session Duration (days)" type="number"
              value={f.sessionDuration} onChange={(e) => patch('sessionDuration', e.target.value)} />
            <Input id="maxLoginAttempts" label="Max Login Attempts" type="number"
              value={f.maxLoginAttempts} onChange={(e) => patch('maxLoginAttempts', e.target.value)} />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="SSO Providers" subtitle="Enable OAuth providers and configure credentials">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-6">
          {SSO_PROVIDERS.map((provider) => (
            <div key={provider.key} className="space-y-3 pb-4 border-b border-border last:border-0 last:pb-0">
              <Toggle id={provider.key} label={provider.label}
                checked={(f as any)[provider.key]} onChange={(v) => patch(provider.key, v)} />
              {(f as any)[provider.key] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-primary/20">
                  <Input id={`${provider.key}-id`} label="Client ID"
                    value={(f as any)[provider.idKey] ?? ''}
                    prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                    onChange={(e) => patch(provider.idKey, e.target.value)} />
                  <Input id={`${provider.key}-secret`} label="Client Secret" type="password"
                    value={(f as any)[provider.secretKey] ?? ''}
                    prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                    onChange={(e) => patch(provider.secretKey, e.target.value)} />
                </div>
              )}
            </div>
          ))}
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

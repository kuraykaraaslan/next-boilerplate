'use client';

import { useState } from 'react';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { b, bStr, SaveRow, type SR, type TabProps } from './platform-tab.shared.component';
import { CommunityProvidersCard } from '@kuraykaraaslan/common/ui/community-providers-card.component';

export function PlatformAuthTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    allowRegistration: b(settings.allowRegistration),
    emailVerificationRequired: b(settings.emailVerificationRequired),
    sessionDuration: settings.sessionDuration ?? '7',
    maxLoginAttempts: settings.maxLoginAttempts ?? '5',
  });

  function patch(key: string, val: string | boolean) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch(): SR {
    return {
      allowRegistration: bStr(f.allowRegistration),
      emailVerificationRequired: bStr(f.emailVerificationRequired),
      sessionDuration: f.sessionDuration,
      maxLoginAttempts: f.maxLoginAttempts,
    };
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

      <CommunityProvidersCard
        point="auth_sso:provider"
        title="SSO Providers"
        subtitle="Social-login providers are community plugins — install & configure them in the Marketplace"
      />
    </div>
  );
}

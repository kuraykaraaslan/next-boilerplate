'use client';

import { useState } from 'react';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { Select } from '@/modules_next/common/ui/Select';
import { b, bStr, SaveRow, type TabProps } from './platform-tab.shared';

const SMS_PROVIDER_OPTIONS = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'netgsm', label: 'Netgsm' },
];

export function PlatformSmsTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    smsEnabled: b(settings.smsEnabled),
    smsProvider: settings.smsProvider ?? 'twilio',
    twilioAccountSid: settings.twilioAccountSid ?? '',
    twilioAuthToken: settings.twilioAuthToken ?? '',
    twilioPhoneNumber: settings.twilioPhoneNumber ?? '',
    netgsmUserCode: settings.netgsmUserCode ?? '',
    netgsmPassword: settings.netgsmPassword ?? '',
    netgsmPhoneNumber: settings.netgsmPhoneNumber ?? '',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) { setF((p) => ({ ...p, [key]: val })); }

  return (
    <div className="pt-6 space-y-6">
      <Card title="SMS Settings">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...f, smsEnabled: bStr(f.smsEnabled) }); }} className="space-y-5">
          <Toggle id="smsEnabled" label="Enable SMS Notifications"
            checked={f.smsEnabled} onChange={(v) => patch('smsEnabled', v)} />
          {f.smsEnabled && (
            <Select id="smsProvider" label="Provider" options={SMS_PROVIDER_OPTIONS}
              value={f.smsProvider} onChange={(e) => patch('smsProvider', e.target.value)} />
          )}
          {f.smsEnabled && f.smsProvider === 'twilio' && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <Input id="twilioSid" label="Account SID" value={f.twilioAccountSid}
                onChange={(e) => patch('twilioAccountSid', e.target.value)} />
              <Input id="twilioToken" label="Auth Token" type="password" value={f.twilioAuthToken}
                onChange={(e) => patch('twilioAuthToken', e.target.value)} />
              <Input id="twilioPhone" label="Phone Number" value={f.twilioPhoneNumber}
                onChange={(e) => patch('twilioPhoneNumber', e.target.value)} />
            </div>
          )}
          {f.smsEnabled && f.smsProvider === 'netgsm' && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <Input id="netgsmUser" label="User Code" value={f.netgsmUserCode}
                onChange={(e) => patch('netgsmUserCode', e.target.value)} />
              <Input id="netgsmPass" label="Password" type="password" value={f.netgsmPassword}
                onChange={(e) => patch('netgsmPassword', e.target.value)} />
              <Input id="netgsmPhone" label="Sender Name / Phone" value={f.netgsmPhoneNumber}
                onChange={(e) => patch('netgsmPhoneNumber', e.target.value)} />
            </div>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

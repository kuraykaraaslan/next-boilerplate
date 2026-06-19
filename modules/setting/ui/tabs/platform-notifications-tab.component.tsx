'use client';

import { useState } from 'react';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { b, bStr, SaveRow, type SR, type TabProps } from './platform-tab.shared.component';
import { CommunityProvidersCard } from '@kuraykaraaslan/common/ui/community-providers-card.component';

export function PlatformNotificationsTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    pushNotificationsEnabled: b(settings.pushNotificationsEnabled),
    vapidPublicKey: settings.vapidPublicKey ?? '',
    vapidPrivateKey: settings.vapidPrivateKey ?? '',
    emailOnNewUser: b(settings.emailOnNewUser),
    slackNotificationsEnabled: b(settings.slackNotificationsEnabled),
    slackWebhookUrl: settings.slackWebhookUrl ?? '',
    adminNotificationEmail: settings.adminNotificationEmail ?? '',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) { setF((p) => ({ ...p, [key]: val })); }
  function buildPatch(): SR {
    return {
      ...f,
      pushNotificationsEnabled: bStr(f.pushNotificationsEnabled),
      emailOnNewUser: bStr(f.emailOnNewUser),
      slackNotificationsEnabled: bStr(f.slackNotificationsEnabled),
    };
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Push Notifications">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="pushEnabled" label="Enable Web Push Notifications"
            checked={f.pushNotificationsEnabled} onChange={(v) => patch('pushNotificationsEnabled', v)} />
          {f.pushNotificationsEnabled && (
            <>
              <Input id="vapidPublicKey" label="VAPID Public Key" value={f.vapidPublicKey}
                onChange={(e) => patch('vapidPublicKey', e.target.value)} />
              <Input id="vapidPrivateKey" label="VAPID Private Key" type="password" value={f.vapidPrivateKey}
                onChange={(e) => patch('vapidPrivateKey', e.target.value)} />
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Email Alerts">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Input id="adminNotificationEmail" label="Admin Notification Email" type="email"
            value={f.adminNotificationEmail}
            onChange={(e) => patch('adminNotificationEmail', e.target.value)} />
          <Toggle id="emailOnNewUser" label="Email on New User Registration"
            checked={f.emailOnNewUser} onChange={(v) => patch('emailOnNewUser', v)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Slack">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="slackEnabled" label="Enable Slack Notifications"
            checked={f.slackNotificationsEnabled}
            onChange={(v) => patch('slackNotificationsEnabled', v)} />
          {f.slackNotificationsEnabled && (
            <Input id="slackWebhookUrl" label="Slack Incoming Webhook URL" type="url"
              value={f.slackWebhookUrl}
              onChange={(e) => patch('slackWebhookUrl', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <CommunityProvidersCard
        point="push:provider"
        title="Push Providers"
        subtitle="Push delivery backends (Web Push/VAPID, …) are community plugins — install & configure them in the Marketplace. (The VAPID keys above are used host-side for Web Push.)"
      />
    </div>
  );
}

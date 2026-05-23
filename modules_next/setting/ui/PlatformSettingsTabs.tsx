'use client';

/**
 * Per-tenant integration / provider configuration tabs surfaced inside the
 * tenant Settings page. Each tenant owns its own row in the `settings` table
 * and configures its own Email, SMS, Storage, Payment, AI providers as well
 * as Auth (SSO), Security policy, and Notification routing.
 *
 * Backend: `/tenant/[tenantId]/api/admin-settings` — admin-only, no root
 * gate (every tenant admin manages its own credentials).
 */

import { useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { Select } from '@/modules_next/common/ui/Select';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe, faEnvelope, faServer, faCreditCard, faRobot,
  faShieldHalved, faBell, faUserLock, faSave, faKey, faMobile,
  faPlug, faCopy, faCheck, faTrash,
} from '@fortawesome/free-solid-svg-icons';

type SR = Record<string, string>;
type TabProps = { settings: SR; onSave: (patch: SR) => Promise<void>; saving: boolean };

function b(v: string | undefined) { return v === 'true'; }
function bStr(v: boolean) { return v ? 'true' : 'false'; }

function SaveRow({ loading }: { loading: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button type="submit" loading={loading} iconLeft={<FontAwesomeIcon icon={faSave} />}>
        Save
      </Button>
    </div>
  );
}

// ─── Platform Auth ────────────────────────────────────────────────────────────

const SSO_PROVIDERS = [
  { key: 'oauthGoogle',    label: 'Google',    idKey: 'googleClientId',    secretKey: 'googleClientSecret' },
  { key: 'oauthGitHub',    label: 'GitHub',    idKey: 'githubClientId',    secretKey: 'githubClientSecret' },
  { key: 'oauthApple',     label: 'Apple',     idKey: 'appleClientId',     secretKey: 'applePrivateKey' },
  { key: 'oauthMeta',      label: 'Meta',      idKey: 'metaClientId',      secretKey: 'metaClientSecret' },
];

function PlatformAuthTab({ settings, onSave, saving }: TabProps) {
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

// ─── Platform Email ───────────────────────────────────────────────────────────

const SMTP_ENCRYPTION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'tls', label: 'TLS' },
  { value: 'ssl', label: 'SSL' },
];

function PlatformEmailTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    smtpHost: settings.smtpHost ?? '',
    smtpPort: settings.smtpPort ?? '587',
    smtpUsername: settings.smtpUsername ?? '',
    smtpPassword: settings.smtpPassword ?? '',
    smtpEncryption: settings.smtpEncryption ?? 'tls',
    fromEmail: settings.fromEmail ?? '',
    fromName: settings.fromName ?? '',
  });

  function patch(key: keyof typeof f, val: string) { setF((p) => ({ ...p, [key]: val })); }

  return (
    <div className="pt-6 space-y-6">
      <Card title="SMTP Configuration" subtitle="Outbound email server">
        <form onSubmit={(e) => { e.preventDefault(); onSave(f); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input id="smtpHost" label="SMTP Host" value={f.smtpHost} placeholder="smtp.sendgrid.net"
                prefixIcon={<FontAwesomeIcon icon={faServer} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('smtpHost', e.target.value)} />
            </div>
            <Input id="smtpPort" label="Port" type="number" value={f.smtpPort}
              onChange={(e) => patch('smtpPort', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="smtpUsername" label="Username" value={f.smtpUsername}
              onChange={(e) => patch('smtpUsername', e.target.value)} />
            <Input id="smtpPassword" label="Password" type="password" value={f.smtpPassword}
              onChange={(e) => patch('smtpPassword', e.target.value)} />
          </div>
          <Select id="smtpEncryption" label="Encryption" options={SMTP_ENCRYPTION_OPTIONS}
            value={f.smtpEncryption} onChange={(e) => patch('smtpEncryption', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Sender Identity">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ fromEmail: f.fromEmail, fromName: f.fromName }); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="fromName" label="From Name" value={f.fromName}
              onChange={(e) => patch('fromName', e.target.value)} />
            <Input id="fromEmail" label="From Email" type="email" value={f.fromEmail}
              prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
              onChange={(e) => patch('fromEmail', e.target.value)} />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Platform SMS ─────────────────────────────────────────────────────────────

const SMS_PROVIDER_OPTIONS = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'netgsm', label: 'Netgsm' },
];

function PlatformSmsTab({ settings, onSave, saving }: TabProps) {
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

// ─── Platform Storage ─────────────────────────────────────────────────────────

const STORAGE_PROVIDER_OPTIONS = [
  { value: 'aws-s3', label: 'Amazon S3' },
  { value: 'cloudflare-r2', label: 'Cloudflare R2' },
  { value: 'digitalocean-spaces', label: 'DigitalOcean Spaces' },
  { value: 'minio', label: 'MinIO' },
];

function PlatformStorageTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    storageProvider: settings.storageProvider ?? 'aws-s3',
    s3Bucket: settings.s3Bucket ?? '',
    s3Region: settings.s3Region ?? '',
    s3AccessKey: settings.s3AccessKey ?? '',
    s3SecretKey: settings.s3SecretKey ?? '',
    s3Endpoint: settings.s3Endpoint ?? '',
    maxFileSizeMb: settings.maxFileSizeMb ?? '10',
    allowedExtensions: settings.allowedExtensions ?? '',
  });

  function patch(key: keyof typeof f, val: string) { setF((p) => ({ ...p, [key]: val })); }
  const showEndpoint = f.storageProvider !== 'aws-s3';

  return (
    <div className="pt-6 space-y-6">
      <Card title="Storage Provider">
        <form onSubmit={(e) => { e.preventDefault(); onSave(f); }} className="space-y-4">
          <Select id="storageProvider" label="Provider" options={STORAGE_PROVIDER_OPTIONS}
            value={f.storageProvider} onChange={(e) => patch('storageProvider', e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="s3Bucket" label="Bucket Name" value={f.s3Bucket}
              onChange={(e) => patch('s3Bucket', e.target.value)} />
            <Input id="s3Region" label="Region" value={f.s3Region}
              onChange={(e) => patch('s3Region', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="s3AccessKey" label="Access Key" value={f.s3AccessKey}
              onChange={(e) => patch('s3AccessKey', e.target.value)} />
            <Input id="s3SecretKey" label="Secret Key" type="password" value={f.s3SecretKey}
              onChange={(e) => patch('s3SecretKey', e.target.value)} />
          </div>
          {showEndpoint && (
            <Input id="s3Endpoint" label="Custom Endpoint URL" type="url" value={f.s3Endpoint}
              onChange={(e) => patch('s3Endpoint', e.target.value)} />
          )}
          <Input id="maxFileSizeMb" label="Max File Size (MB)" type="number" value={f.maxFileSizeMb}
            onChange={(e) => patch('maxFileSizeMb', e.target.value)} />
          <Input id="allowedExtensions" label="Allowed Extensions" value={f.allowedExtensions}
            placeholder="jpg,png,pdf,docx"
            onChange={(e) => patch('allowedExtensions', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Platform Payment ─────────────────────────────────────────────────────────

function PlatformPaymentTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    currency: settings.currency ?? 'USD',
    taxEnabled: b(settings.taxEnabled),
    taxRate: settings.taxRate ?? '0',
    stripeEnabled: b(settings.stripeEnabled),
    stripePublicKey: settings.stripePublicKey ?? '',
    stripeSecretKey: settings.stripeSecretKey ?? '',
    stripeWebhookSecret: settings.stripeWebhookSecret ?? '',
    iyzicoEnabled: b(settings.iyzicoEnabled),
    iyzicoApiKey: settings.iyzicoApiKey ?? '',
    iyzicoSecretKey: settings.iyzicoSecretKey ?? '',
    iyzicoSandboxMode: b(settings.iyzicoSandboxMode),
    subscriptionEnabled: b(settings.subscriptionEnabled),
    defaultTrialDays: settings.defaultTrialDays ?? '14',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch(): SR {
    return {
      ...f,
      taxEnabled: bStr(f.taxEnabled),
      stripeEnabled: bStr(f.stripeEnabled),
      iyzicoEnabled: bStr(f.iyzicoEnabled),
      iyzicoSandboxMode: bStr(f.iyzicoSandboxMode),
      subscriptionEnabled: bStr(f.subscriptionEnabled),
    };
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Currency & Tax">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ currency: f.currency, taxEnabled: bStr(f.taxEnabled), taxRate: f.taxRate }); }} className="space-y-4">
          <Input id="currency" label="Default Currency" value={f.currency} placeholder="USD"
            onChange={(e) => patch('currency', e.target.value)} />
          <Toggle id="taxEnabled" label="Enable Tax"
            checked={f.taxEnabled} onChange={(v) => patch('taxEnabled', v)} />
          {f.taxEnabled && (
            <Input id="taxRate" label="Tax Rate (%)" type="number" value={f.taxRate}
              onChange={(e) => patch('taxRate', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Subscription">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ subscriptionEnabled: bStr(f.subscriptionEnabled), defaultTrialDays: f.defaultTrialDays }); }} className="space-y-4">
          <Toggle id="subscriptionEnabled" label="Enable Subscriptions"
            checked={f.subscriptionEnabled} onChange={(v) => patch('subscriptionEnabled', v)} />
          <Input id="defaultTrialDays" label="Default Trial Days" type="number" value={f.defaultTrialDays}
            onChange={(e) => patch('defaultTrialDays', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Stripe">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="stripeEnabled" label="Enable Stripe"
            checked={f.stripeEnabled} onChange={(v) => patch('stripeEnabled', v)} />
          {f.stripeEnabled && (
            <>
              <Input id="stripePublicKey" label="Publishable Key" value={f.stripePublicKey}
                onChange={(e) => patch('stripePublicKey', e.target.value)} />
              <Input id="stripeSecretKey" label="Secret Key" type="password" value={f.stripeSecretKey}
                onChange={(e) => patch('stripeSecretKey', e.target.value)} />
              <Input id="stripeWebhookSecret" label="Webhook Signing Secret" type="password"
                value={f.stripeWebhookSecret}
                onChange={(e) => patch('stripeWebhookSecret', e.target.value)} />
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Iyzico (Turkey)">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="iyzicoEnabled" label="Enable Iyzico"
            checked={f.iyzicoEnabled} onChange={(v) => patch('iyzicoEnabled', v)} />
          {f.iyzicoEnabled && (
            <>
              <Toggle id="iyzicoSandbox" label="Sandbox Mode" size="sm"
                checked={f.iyzicoSandboxMode} onChange={(v) => patch('iyzicoSandboxMode', v)} />
              <Input id="iyzicoApiKey" label="API Key" value={f.iyzicoApiKey}
                onChange={(e) => patch('iyzicoApiKey', e.target.value)} />
              <Input id="iyzicoSecretKey" label="Secret Key" type="password" value={f.iyzicoSecretKey}
                onChange={(e) => patch('iyzicoSecretKey', e.target.value)} />
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Platform AI ──────────────────────────────────────────────────────────────

const AI_PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
];

function PlatformAiTab({ settings, onSave, saving }: TabProps) {
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

// ─── Platform Security ────────────────────────────────────────────────────────

function PlatformSecurityTab({ settings, onSave, saving }: TabProps) {
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

// ─── Platform Notifications ───────────────────────────────────────────────────

function PlatformNotificationsTab({ settings, onSave, saving }: TabProps) {
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
    </div>
  );
}

// ─── Platform SCIM ────────────────────────────────────────────────────────────

// SCIM 2.0 (RFC 7644) — IdPs (Okta, Azure AD, OneLogin, Google Workspace) push
// user/group lifecycle events to our SP via bearer-authenticated REST calls.
// Documentation references (links live in the UI as inline help):
//   • Okta:        https://developer.okta.com/docs/guides/scim-provisioning-integration-overview/
//   • Azure AD:    https://learn.microsoft.com/azure/active-directory/app-provisioning/use-scim-to-provision-users-and-groups
//   • OneLogin:    https://developers.onelogin.com/scim
//   • Google W.:   https://support.google.com/a/answer/9012148

type ScimToken = {
  apiKeyId: string;
  tenantId: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function PlatformScimTab({ tenantId }: { tenantId: string }) {
  const [tokens, setTokens] = useState<ScimToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [endpoint, setEndpoint] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [revealKey, setRevealKey] = useState('');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEndpoint(`${window.location.origin}/tenant/${tenantId}/api/scim/v2`);
    }
    api.get(`/tenant/${tenantId}/api/api-keys`)
      .then((res) => {
        const all: ScimToken[] = res.data.keys ?? [];
        // Only SCIM-scoped keys belong on this tab.
        setTokens(all.filter((k) => k.scopes.some((s) => s.startsWith('scim:'))));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function copy(text: string, which: 'endpoint' | 'token') {
    try { await navigator.clipboard.writeText(text); } catch {}
    if (which === 'endpoint') {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  }

  async function generateToken() {
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/api-keys`, {
        name: `SCIM provisioning token (${new Date().toISOString().slice(0, 10)})`,
        description: 'Generated via Settings → Integrations → SCIM Provisioning',
        scopes: ['scim:read', 'scim:write'],
      });
      setTokens((prev) => [res.data.key, ...prev]);
      setRevealKey(res.data.rawKey);
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? err?.message ?? 'Failed to generate token.');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(apiKeyId: string) {
    setRevoking(apiKeyId);
    try {
      await api.delete(`/tenant/${tenantId}/api/api-keys/${apiKeyId}`);
      setTokens((prev) => prev.filter((t) => t.apiKeyId !== apiKeyId));
    } catch {} finally {
      setRevoking(null);
    }
  }

  function formatDate(val: string | null): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="pt-6 space-y-6">
      <Card
        title="SCIM 2.0 Endpoint"
        subtitle="Configure your IdP (Okta, Azure AD, OneLogin) with this base URL and a bearer token below."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-overlay p-3">
            <code className="flex-1 text-xs font-mono break-all text-text-primary select-all">
              {endpoint || `/tenant/${tenantId}/api/scim/v2`}
            </code>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Copy SCIM endpoint"
              onClick={() => copy(endpoint, 'endpoint')}
              iconLeft={
                <FontAwesomeIcon
                  icon={copiedEndpoint ? faCheck : faCopy}
                  className={copiedEndpoint ? 'text-success' : undefined}
                />
              }
            />
          </div>
          <AlertBanner
            variant="info"
            message="The SCIM v2 module is wired separately. Once enabled, your IdP can push User and Group lifecycle events here."
          />
          <p className="text-xs text-text-secondary leading-relaxed">
            Setup guides: <span className="font-mono">Okta SCIM</span>, <span className="font-mono">Azure AD SCIM</span>, <span className="font-mono">OneLogin SCIM</span>, <span className="font-mono">Google Workspace SCIM</span>.
            Each IdP needs the endpoint above and an active <code>scim:read</code> / <code>scim:write</code> bearer token.
          </p>
        </div>
      </Card>

      <Card
        title="Provisioning Tokens"
        subtitle="Bearer tokens used by your IdP to authenticate against the SCIM endpoint."
      >
        <div className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}
          {revealKey && (
            <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
              <p className="text-xs font-medium text-text-primary">
                Copy this token now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-overlay p-3">
                <code className="flex-1 text-xs font-mono break-all text-text-primary select-all">{revealKey}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label="Copy SCIM token"
                  onClick={() => copy(revealKey, 'token')}
                  iconLeft={
                    <FontAwesomeIcon
                      icon={copiedToken ? faCheck : faCopy}
                      className={copiedToken ? 'text-success' : undefined}
                    />
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setRevealKey('')}>
                  Done
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={generateToken}
              loading={creating}
              iconLeft={<FontAwesomeIcon icon={faKey} />}
            >
              Generate SCIM token
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner size="md" /></div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">
              No SCIM tokens yet. Generate one to connect an IdP.
            </p>
          ) : (
            <div className="border border-border rounded-lg divide-y divide-border">
              {tokens.map((t) => (
                <div key={t.apiKeyId} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{t.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      <code className="font-mono">{t.keyPrefix}…</code>
                      <span className="mx-2">•</span>
                      Scopes: {t.scopes.join(', ')}
                      <span className="mx-2">•</span>
                      Last used: {formatDate(t.lastUsedAt)}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revoke(t.apiKeyId)}
                    loading={revoking === t.apiKeyId}
                    iconLeft={<FontAwesomeIcon icon={faTrash} />}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Public surface ───────────────────────────────────────────────────────────

const ICON = (icon: React.ReactNode) => <span className="text-sm">{icon}</span>;

/**
 * Renders the eight platform-level tabs. Owns its own load/save state against
 * the tenant-scoped system-settings endpoint, independent of the per-tenant
 * settings store used by GeneralTab / BrandingTab / etc.
 */
export function PlatformSettingsTabs({ tenantId }: { tenantId: string }) {
  const [settings, setSettings] = useState<SR>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/admin-settings`)
      .then((res) => setSettings(res.data.settings ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleSave = useCallback(async (patch: SR) => {
    setSaving(true);
    setToast(null);
    try {
      await api.put(`/tenant/${tenantId}/api/admin-settings`, { settings: { ...settings, ...patch } });
      setSettings((prev) => ({ ...prev, ...patch }));
      setToast({ type: 'success', msg: 'Platform settings saved.' });
    } catch (err: any) {
      setToast({ type: 'error', msg: err.response?.data?.message ?? err.message ?? 'Failed to save.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, [tenantId, settings]);

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  const sharedProps: TabProps = { settings, onSave: handleSave, saving };

  return (
    <div className="space-y-4">
      <AlertBanner variant="info" message="These provider credentials and policies apply only to this tenant. Other tenants keep their own configuration." />
      {toast && (
        <AlertBanner
          variant={toast.type === 'success' ? 'success' : 'error'}
          message={toast.msg}
          dismissible
        />
      )}
      <TabGroup
        label="Platform settings"
        lazy
        tabs={[
          { id: 'p-auth',   label: 'SSO Providers',   icon: ICON(<FontAwesomeIcon icon={faUserLock} />),   content: <PlatformAuthTab          {...sharedProps} /> },
          { id: 'p-scim',   label: 'SCIM Provisioning', icon: ICON(<FontAwesomeIcon icon={faPlug} />),     content: <PlatformScimTab          tenantId={tenantId} /> },
          { id: 'p-email',  label: 'Email',           icon: ICON(<FontAwesomeIcon icon={faEnvelope} />),   content: <PlatformEmailTab         {...sharedProps} /> },
          { id: 'p-sms',    label: 'SMS',             icon: ICON(<FontAwesomeIcon icon={faMobile} />),     content: <PlatformSmsTab           {...sharedProps} /> },
          { id: 'p-stor',   label: 'Storage',         icon: ICON(<FontAwesomeIcon icon={faServer} />),     content: <PlatformStorageTab       {...sharedProps} /> },
          { id: 'p-pay',    label: 'Payments',        icon: ICON(<FontAwesomeIcon icon={faCreditCard} />), content: <PlatformPaymentTab       {...sharedProps} /> },
          { id: 'p-ai',     label: 'AI',              icon: ICON(<FontAwesomeIcon icon={faRobot} />),      content: <PlatformAiTab            {...sharedProps} /> },
          { id: 'p-sec',    label: 'Security',        icon: ICON(<FontAwesomeIcon icon={faShieldHalved} />), content: <PlatformSecurityTab    {...sharedProps} /> },
          { id: 'p-notif',  label: 'Notifications',   icon: ICON(<FontAwesomeIcon icon={faBell} />),       content: <PlatformNotificationsTab {...sharedProps} /> },
        ]}
      />
    </div>
  );
}

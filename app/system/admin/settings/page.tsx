'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/modules_next/common/axios';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { Select } from '@/modules_next/common/ui/Select';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe, faEnvelope, faServer, faCreditCard, faRobot,
  faShieldHalved, faBell, faUserLock, faSave, faKey, faLink,
  faCopy, faCheck, faMobile, faGear,
} from '@fortawesome/free-solid-svg-icons';

type SR = Record<string, string>;
type TabProps = { settings: SR; onSave: (patch: SR) => Promise<void>; saving: boolean };

// ─── Utilities ────────────────────────────────────────────────────────────────

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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      className="text-text-disabled hover:text-text-primary transition-colors focus-visible:outline-none"
    >
      <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-3.5 h-3.5" />
    </button>
  );
}

function origin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    siteName: settings.siteName ?? '',
    siteUrl: settings.siteUrl ?? '',
    siteDescription: settings.siteDescription ?? '',
    contactName: settings.contactName ?? '',
    contactEmail: settings.contactEmail ?? '',
    contactPhone: settings.contactPhone ?? '',
    maintenanceMode: b(settings.maintenanceMode),
    maintenanceMessage: settings.maintenanceMessage ?? '',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) {
    setF((p) => ({ ...p, [key]: val }));
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="Site Information" subtitle="Basic application identity">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ siteName: f.siteName, siteUrl: f.siteUrl, siteDescription: f.siteDescription }); }}
          className="space-y-4"
        >
          <Input id="siteName" label="Site Name" value={f.siteName} prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            onChange={(e) => patch('siteName', e.target.value)} />
          <Input id="siteUrl" label="Site URL" type="url" value={f.siteUrl} placeholder="https://app.example.com"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            onChange={(e) => patch('siteUrl', e.target.value)} />
          <Input id="siteDescription" label="Site Description" value={f.siteDescription}
            onChange={(e) => patch('siteDescription', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Contact" subtitle="Public-facing contact information">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ contactName: f.contactName, contactEmail: f.contactEmail, contactPhone: f.contactPhone }); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="contactName" label="Contact Name" value={f.contactName} onChange={(e) => patch('contactName', e.target.value)} />
            <Input id="contactPhone" label="Contact Phone" type="tel" value={f.contactPhone} onChange={(e) => patch('contactPhone', e.target.value)} />
          </div>
          <Input id="contactEmail" label="Contact Email" type="email" value={f.contactEmail}
            prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
            onChange={(e) => patch('contactEmail', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Maintenance Mode" subtitle="Temporarily disable public access">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ maintenanceMode: bStr(f.maintenanceMode), maintenanceMessage: f.maintenanceMessage }); }}
          className="space-y-4"
        >
          <Toggle id="maintenanceMode" label="Enable Maintenance Mode"
            description="All non-admin requests will receive a maintenance notice."
            checked={f.maintenanceMode} onChange={(v) => patch('maintenanceMode', v)} />
          {f.maintenanceMode && (
            <Input id="maintenanceMessage" label="Maintenance Message" value={f.maintenanceMessage}
              placeholder="We'll be back shortly. Thank you for your patience."
              onChange={(e) => patch('maintenanceMessage', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Auth Tab ─────────────────────────────────────────────────────────────────

const SSO_PROVIDERS = [
  { key: 'oauthGoogle',    label: 'Google',    idKey: 'googleClientId',    secretKey: 'googleClientSecret' },
  { key: 'oauthGitHub',   label: 'GitHub',    idKey: 'githubClientId',    secretKey: 'githubClientSecret' },
  { key: 'oauthMicrosoft',label: 'Microsoft', idKey: '',                  secretKey: '' },
  { key: 'oauthLinkedIn', label: 'LinkedIn',  idKey: '',                  secretKey: '' },
  { key: 'oauthApple',    label: 'Apple',     idKey: 'appleClientId',     secretKey: 'applePrivateKey' },
  { key: 'oauthMeta',     label: 'Meta',      idKey: 'metaClientId',      secretKey: 'metaClientSecret' },
  { key: 'oauthAutodesk', label: 'Autodesk',  idKey: 'autodeskClientId',  secretKey: 'autodeskClientSecret' },
];

function AuthTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    allowRegistration: b(settings.allowRegistration),
    emailVerificationRequired: b(settings.emailVerificationRequired),
    sessionDuration: settings.sessionDuration ?? '7',
    maxLoginAttempts: settings.maxLoginAttempts ?? '5',
    ...Object.fromEntries(SSO_PROVIDERS.map((p) => [p.key, b(settings[p.key])])),
    googleClientId: settings.googleClientId ?? '',
    googleClientSecret: settings.googleClientSecret ?? '',
    githubClientId: settings.githubClientId ?? '',
    githubClientSecret: settings.githubClientSecret ?? '',
    appleClientId: settings.appleClientId ?? '',
    applePrivateKey: settings.applePrivateKey ?? '',
    metaClientId: settings.metaClientId ?? '',
    metaClientSecret: settings.metaClientSecret ?? '',
    autodeskClientId: settings.autodeskClientId ?? '',
    autodeskClientSecret: settings.autodeskClientSecret ?? '',
  });

  function patch(key: string, val: string | boolean) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch() {
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
      autodeskClientId: f.autodeskClientId,
      autodeskClientSecret: f.autodeskClientSecret,
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
              value={f.sessionDuration} onChange={(e) => patch('sessionDuration', e.target.value)}
              hint="How long a user stays logged in (refresh token lifetime)." />
            <Input id="maxLoginAttempts" label="Max Login Attempts" type="number"
              value={f.maxLoginAttempts} onChange={(e) => patch('maxLoginAttempts', e.target.value)}
              hint="Failed attempts before temporary account lockout." />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="SSO Providers" subtitle="Enable OAuth providers and configure their credentials">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-6">
          {SSO_PROVIDERS.map((provider) => (
            <div key={provider.key} className="space-y-3 pb-4 border-b border-border last:border-0 last:pb-0">
              <Toggle id={provider.key} label={provider.label}
                checked={(f as any)[provider.key]} onChange={(v) => patch(provider.key, v)} />
              {(f as any)[provider.key] && provider.idKey && (
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

// ─── Email Tab ────────────────────────────────────────────────────────────────

const SMTP_ENCRYPTION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'tls', label: 'TLS' },
  { value: 'ssl', label: 'SSL' },
];

function EmailTab({ settings, onSave, saving }: TabProps) {
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
      <Card title="SMTP Configuration" subtitle="Outbound email server settings">
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
            <Input id="smtpUsername" label="Username" type="email" value={f.smtpUsername}
              onChange={(e) => patch('smtpUsername', e.target.value)} />
            <Input id="smtpPassword" label="Password" type="password" value={f.smtpPassword}
              onChange={(e) => patch('smtpPassword', e.target.value)} />
          </div>
          <Select id="smtpEncryption" label="Encryption" options={SMTP_ENCRYPTION_OPTIONS}
            value={f.smtpEncryption} onChange={(e) => patch('smtpEncryption', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Sender Identity" subtitle="From address shown to recipients">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ fromEmail: f.fromEmail, fromName: f.fromName }); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="fromName" label="From Name" value={f.fromName} placeholder="Acme Support"
              onChange={(e) => patch('fromName', e.target.value)} />
            <Input id="fromEmail" label="From Email" type="email" value={f.fromEmail} placeholder="noreply@acme.com"
              prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
              onChange={(e) => patch('fromEmail', e.target.value)} />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── SMS Tab ──────────────────────────────────────────────────────────────────

const SMS_PROVIDER_OPTIONS = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'netgsm', label: 'Netgsm' },
  { value: 'nexmo', label: 'Nexmo (Vonage)' },
  { value: 'clickatell', label: 'Clickatell' },
];

function SmsTab({ settings, onSave, saving }: TabProps) {
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

  function patch(key: keyof typeof f, val: string | boolean) { setF((p) => ({ ...p, [key]: val })); }

  return (
    <div className="pt-6 space-y-6">
      <Card title="SMS Settings">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ ...f, smsEnabled: bStr(f.smsEnabled) }); }}
          className="space-y-5"
        >
          <Toggle id="smsEnabled" label="Enable SMS Notifications"
            description="Send OTPs and alerts via SMS."
            checked={f.smsEnabled} onChange={(v) => patch('smsEnabled', v)} />

          {f.smsEnabled && (
            <>
              <Select id="smsProvider" label="Provider" options={SMS_PROVIDER_OPTIONS}
                value={f.smsProvider} onChange={(e) => patch('smsProvider', e.target.value)} />

              {f.smsProvider === 'twilio' && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <Input id="twilioSid" label="Account SID" value={f.twilioAccountSid}
                    prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                    onChange={(e) => patch('twilioAccountSid', e.target.value)} />
                  <Input id="twilioToken" label="Auth Token" type="password" value={f.twilioAuthToken}
                    prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                    onChange={(e) => patch('twilioAuthToken', e.target.value)} />
                  <Input id="twilioPhone" label="Twilio Phone Number" type="tel" value={f.twilioPhoneNumber}
                    prefixIcon={<FontAwesomeIcon icon={faMobile} className="w-3.5 h-3.5" />}
                    placeholder="+15551234567"
                    onChange={(e) => patch('twilioPhoneNumber', e.target.value)} />
                </div>
              )}

              {f.smsProvider === 'netgsm' && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <Input id="netgsmUser" label="User Code" value={f.netgsmUserCode}
                    onChange={(e) => patch('netgsmUserCode', e.target.value)} />
                  <Input id="netgsmPass" label="Password" type="password" value={f.netgsmPassword}
                    onChange={(e) => patch('netgsmPassword', e.target.value)} />
                  <Input id="netgsmPhone" label="Sender Name / Phone" value={f.netgsmPhoneNumber}
                    onChange={(e) => patch('netgsmPhoneNumber', e.target.value)} />
                </div>
              )}
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Storage Tab ──────────────────────────────────────────────────────────────

const STORAGE_PROVIDER_OPTIONS = [
  { value: 'aws-s3', label: 'Amazon S3' },
  { value: 'cloudflare-r2', label: 'Cloudflare R2' },
  { value: 'digitalocean-spaces', label: 'DigitalOcean Spaces' },
  { value: 'minio', label: 'MinIO (Self-hosted)' },
];

function StorageTab({ settings, onSave, saving }: TabProps) {
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
            <Input id="s3Region" label="Region" value={f.s3Region} placeholder="us-east-1"
              onChange={(e) => patch('s3Region', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="s3AccessKey" label="Access Key" value={f.s3AccessKey}
              prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
              onChange={(e) => patch('s3AccessKey', e.target.value)} />
            <Input id="s3SecretKey" label="Secret Key" type="password" value={f.s3SecretKey}
              prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
              onChange={(e) => patch('s3SecretKey', e.target.value)} />
          </div>
          {showEndpoint && (
            <Input id="s3Endpoint" label="Custom Endpoint URL" type="url" value={f.s3Endpoint}
              placeholder="https://xxx.r2.cloudflarestorage.com"
              prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
              hint="Required for R2, Spaces, and MinIO."
              onChange={(e) => patch('s3Endpoint', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Upload Limits">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ maxFileSizeMb: f.maxFileSizeMb, allowedExtensions: f.allowedExtensions }); }}
          className="space-y-4"
        >
          <Input id="maxFileSizeMb" label="Max File Size (MB)" type="number" value={f.maxFileSizeMb}
            onChange={(e) => patch('maxFileSizeMb', e.target.value)} />
          <Input id="allowedExtensions" label="Allowed Extensions" value={f.allowedExtensions}
            placeholder="jpg,png,pdf,docx"
            hint="Comma-separated list. Leave empty to allow all."
            onChange={(e) => patch('allowedExtensions', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Payment Tab ──────────────────────────────────────────────────────────────

function PaymentTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    currency: settings.currency ?? 'USD',
    taxEnabled: b(settings.taxEnabled),
    taxRate: settings.taxRate ?? '0',
    stripeEnabled: b(settings.stripeEnabled),
    stripePublicKey: settings.stripePublicKey ?? '',
    stripeSecretKey: settings.stripeSecretKey ?? '',
    stripeWebhookSecret: settings.stripeWebhookSecret ?? '',
    paypalEnabled: b(settings.paypalEnabled),
    paypalClientId: settings.paypalClientId ?? '',
    paypalClientSecret: settings.paypalClientSecret ?? '',
    paypalSandboxMode: b(settings.paypalSandboxMode),
    paypalWebhookId: settings.paypalWebhookId ?? '',
    iyzicoEnabled: b(settings.iyzicoEnabled),
    iyzicoApiKey: settings.iyzicoApiKey ?? '',
    iyzicoSecretKey: settings.iyzicoSecretKey ?? '',
    iyzicoSandboxMode: b(settings.iyzicoSandboxMode),
    subscriptionEnabled: b(settings.subscriptionEnabled),
    defaultTrialDays: settings.defaultTrialDays ?? '14',
    subscriptionGracePeriodDays: settings.subscriptionGracePeriodDays ?? '7',
  });

  function patch(key: keyof typeof f, val: string | boolean) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch(): SR {
    return {
      ...f,
      taxEnabled: bStr(f.taxEnabled),
      stripeEnabled: bStr(f.stripeEnabled),
      paypalEnabled: bStr(f.paypalEnabled),
      paypalSandboxMode: bStr(f.paypalSandboxMode),
      iyzicoEnabled: bStr(f.iyzicoEnabled),
      iyzicoSandboxMode: bStr(f.iyzicoSandboxMode),
      subscriptionEnabled: bStr(f.subscriptionEnabled),
    };
  }

  const stripeUrl = `${origin()}/system/api/webhooks/stripe`;
  const paypalUrl = `${origin()}/system/api/webhooks/paypal`;
  const iyzicoUrl = `${origin()}/system/api/webhooks/iyzico`;

  return (
    <div className="pt-6 space-y-6">
      {/* Currency & Tax */}
      <Card title="Currency & Tax">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ currency: f.currency, taxEnabled: bStr(f.taxEnabled), taxRate: f.taxRate }); }}
          className="space-y-4"
        >
          <Input id="currency" label="Default Currency" value={f.currency} placeholder="USD"
            hint="ISO 4217 currency code." onChange={(e) => patch('currency', e.target.value)} />
          <Toggle id="taxEnabled" label="Enable Tax"
            checked={f.taxEnabled} onChange={(v) => patch('taxEnabled', v)} />
          {f.taxEnabled && (
            <Input id="taxRate" label="Tax Rate (%)" type="number" value={f.taxRate}
              onChange={(e) => patch('taxRate', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      {/* Subscription */}
      <Card title="Subscription Settings">
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ subscriptionEnabled: bStr(f.subscriptionEnabled), defaultTrialDays: f.defaultTrialDays, subscriptionGracePeriodDays: f.subscriptionGracePeriodDays }); }}
          className="space-y-4"
        >
          <Toggle id="subscriptionEnabled" label="Enable Subscriptions"
            checked={f.subscriptionEnabled} onChange={(v) => patch('subscriptionEnabled', v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="defaultTrialDays" label="Default Trial Days" type="number" value={f.defaultTrialDays}
              onChange={(e) => patch('defaultTrialDays', e.target.value)} />
            <Input id="gracePeriodDays" label="Grace Period Days" type="number" value={f.subscriptionGracePeriodDays}
              hint="Days after expiry before subscription is suspended."
              onChange={(e) => patch('subscriptionGracePeriodDays', e.target.value)} />
          </div>
          <SaveRow loading={saving} />
        </form>
      </Card>

      {/* Stripe */}
      <Card title="Stripe" subtitle="Accept card payments via Stripe">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="stripeEnabled" label="Enable Stripe"
            checked={f.stripeEnabled} onChange={(v) => patch('stripeEnabled', v)} />
          {f.stripeEnabled && (
            <>
              <Input id="stripePublicKey" label="Publishable Key" value={f.stripePublicKey} placeholder="pk_live_..."
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('stripePublicKey', e.target.value)} />
              <Input id="stripeSecretKey" label="Secret Key" type="password" value={f.stripeSecretKey} placeholder="sk_live_..."
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('stripeSecretKey', e.target.value)} />
              <Input id="stripeWebhookEndpoint" label="Webhook Endpoint" readOnly value={stripeUrl}
                prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
                suffixIcon={<CopyButton value={stripeUrl} />}
                hint="Add this URL in Stripe Dashboard → Webhooks" />
              <Input id="stripeWebhookSecret" label="Webhook Signing Secret" type="password" value={f.stripeWebhookSecret} placeholder="whsec_..."
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('stripeWebhookSecret', e.target.value)} />
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      {/* PayPal */}
      <Card title="PayPal" subtitle="Accept PayPal and card payments">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="paypalEnabled" label="Enable PayPal"
            checked={f.paypalEnabled} onChange={(v) => patch('paypalEnabled', v)} />
          {f.paypalEnabled && (
            <>
              <Toggle id="paypalSandbox" label="Sandbox Mode" size="sm"
                checked={f.paypalSandboxMode} onChange={(v) => patch('paypalSandboxMode', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="paypalClientId" label="Client ID" value={f.paypalClientId}
                  prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                  onChange={(e) => patch('paypalClientId', e.target.value)} />
                <Input id="paypalClientSecret" label="Client Secret" type="password" value={f.paypalClientSecret}
                  prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                  onChange={(e) => patch('paypalClientSecret', e.target.value)} />
              </div>
              <Input id="paypalWebhookEndpoint" label="Webhook Endpoint" readOnly value={paypalUrl}
                prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
                suffixIcon={<CopyButton value={paypalUrl} />}
                hint="Add this URL in PayPal Developer Dashboard → Webhooks" />
              <Input id="paypalWebhookId" label="Webhook ID" value={f.paypalWebhookId} placeholder="WH-XXXX..."
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('paypalWebhookId', e.target.value)} />
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      {/* Iyzico */}
      <Card title="Iyzico" subtitle="Accept payments via Iyzico (Turkey)">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="iyzicoEnabled" label="Enable Iyzico"
            checked={f.iyzicoEnabled} onChange={(v) => patch('iyzicoEnabled', v)} />
          {f.iyzicoEnabled && (
            <>
              <Toggle id="iyzicoSandbox" label="Sandbox Mode" size="sm"
                checked={f.iyzicoSandboxMode} onChange={(v) => patch('iyzicoSandboxMode', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="iyzicoApiKey" label="API Key" value={f.iyzicoApiKey}
                  prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                  onChange={(e) => patch('iyzicoApiKey', e.target.value)} />
                <Input id="iyzicoSecretKey" label="Secret Key" type="password" value={f.iyzicoSecretKey}
                  prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                  onChange={(e) => patch('iyzicoSecretKey', e.target.value)} />
              </div>
              <Input id="iyzicoCallbackEndpoint" label="Callback URL" readOnly value={iyzicoUrl}
                prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
                suffixIcon={<CopyButton value={iyzicoUrl} />}
                hint="Set as callbackUrl in Iyzico Merchant Settings" />
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── AI Tab ───────────────────────────────────────────────────────────────────

const AI_PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
];

function AiTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    aiEnabled: b(settings.aiEnabled),
    aiDefaultProvider: settings.aiDefaultProvider ?? 'openai',
    aiDailyLimit: settings.aiDailyLimit ?? '',
    aiMonthlyBudget: settings.aiMonthlyBudget ?? '',
    openaiApiKey: settings.openaiApiKey ?? '',
    openaiDefaultModel: settings.openaiDefaultModel ?? 'gpt-4o',
    openaiMaxTokens: settings.openaiMaxTokens ?? '4096',
    openaiBaseUrl: settings.openaiBaseUrl ?? '',
    anthropicApiKey: settings.anthropicApiKey ?? '',
    anthropicDefaultModel: settings.anthropicDefaultModel ?? 'claude-sonnet-4-6',
    anthropicMaxTokens: settings.anthropicMaxTokens ?? '4096',
    googleAiApiKey: settings.googleAiApiKey ?? '',
    googleDefaultModel: settings.googleDefaultModel ?? 'gemini-2.0-flash',
    googleMaxTokens: settings.googleMaxTokens ?? '4096',
  });

  function patch(key: keyof typeof f, val: string | boolean) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch(): SR {
    return { ...f, aiEnabled: bStr(f.aiEnabled) };
  }

  return (
    <div className="pt-6 space-y-6">
      <Card title="AI Settings">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-5">
          <Toggle id="aiEnabled" label="Enable AI Features"
            description="Enables AI-powered features across the platform."
            checked={f.aiEnabled} onChange={(v) => patch('aiEnabled', v)} />
          {f.aiEnabled && (
            <>
              <Select id="aiDefaultProvider" label="Default Provider" options={AI_PROVIDER_OPTIONS}
                value={f.aiDefaultProvider} onChange={(e) => patch('aiDefaultProvider', e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="aiDailyLimit" label="Daily Request Limit" type="number" value={f.aiDailyLimit}
                  hint="Max AI requests per day. Leave empty for unlimited."
                  onChange={(e) => patch('aiDailyLimit', e.target.value)} />
                <Input id="aiMonthlyBudget" label="Monthly Budget (USD)" type="number" value={f.aiMonthlyBudget}
                  hint="Approximate cost cap in USD per month."
                  onChange={(e) => patch('aiMonthlyBudget', e.target.value)} />
              </div>
            </>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      {f.aiEnabled && (
        <>
          <Card title="OpenAI" subtitle="GPT-4o, GPT-4 Turbo, and more">
            <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
              <Input id="openaiApiKey" label="API Key" type="password" value={f.openaiApiKey} placeholder="sk-..."
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('openaiApiKey', e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="openaiModel" label="Default Model" value={f.openaiDefaultModel}
                  onChange={(e) => patch('openaiDefaultModel', e.target.value)} />
                <Input id="openaiMaxTokens" label="Max Tokens" type="number" value={f.openaiMaxTokens}
                  onChange={(e) => patch('openaiMaxTokens', e.target.value)} />
              </div>
              <Input id="openaiBaseUrl" label="Base URL (Optional)" type="url" value={f.openaiBaseUrl}
                placeholder="https://api.openai.com/v1"
                hint="Override for Azure OpenAI or other compatible endpoints."
                onChange={(e) => patch('openaiBaseUrl', e.target.value)} />
              <SaveRow loading={saving} />
            </form>
          </Card>

          <Card title="Anthropic" subtitle="Claude Opus, Sonnet, and Haiku">
            <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
              <Input id="anthropicApiKey" label="API Key" type="password" value={f.anthropicApiKey} placeholder="sk-ant-..."
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('anthropicApiKey', e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="anthropicModel" label="Default Model" value={f.anthropicDefaultModel}
                  onChange={(e) => patch('anthropicDefaultModel', e.target.value)} />
                <Input id="anthropicMaxTokens" label="Max Tokens" type="number" value={f.anthropicMaxTokens}
                  onChange={(e) => patch('anthropicMaxTokens', e.target.value)} />
              </div>
              <SaveRow loading={saving} />
            </form>
          </Card>

          <Card title="Google Gemini" subtitle="Gemini 2.0 Flash, Pro, and Ultra">
            <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
              <Input id="googleAiApiKey" label="API Key" type="password" value={f.googleAiApiKey} placeholder="AIza..."
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('googleAiApiKey', e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="googleModel" label="Default Model" value={f.googleDefaultModel}
                  onChange={(e) => patch('googleDefaultModel', e.target.value)} />
                <Input id="googleMaxTokens" label="Max Tokens" type="number" value={f.googleMaxTokens}
                  onChange={(e) => patch('googleMaxTokens', e.target.value)} />
              </div>
              <SaveRow loading={saving} />
            </form>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    rateLimitEnabled: b(settings.rateLimitEnabled),
    rateLimitPerMinute: settings.rateLimitPerMinute ?? '60',
    rateLimitPerHour: settings.rateLimitPerHour ?? '1000',
    corsAllowedOrigins: settings.corsAllowedOrigins ?? '',
    hstsEnabled: b(settings.hstsEnabled),
    xFrameOptions: settings.xFrameOptions ?? 'SAMEORIGIN',
    blockedIps: settings.blockedIps ?? '',
    recaptchaEnabled: b(settings.recaptchaEnabled),
    recaptchaClientKey: settings.recaptchaClientKey ?? '',
    recaptchaServerKey: settings.recaptchaServerKey ?? '',
    cronSecret: settings.cronSecret ?? '',
  });

  function patch(key: keyof typeof f, val: string | boolean) { setF((p) => ({ ...p, [key]: val })); }

  function buildPatch(): SR {
    return {
      ...f,
      rateLimitEnabled: bStr(f.rateLimitEnabled),
      hstsEnabled: bStr(f.hstsEnabled),
      recaptchaEnabled: bStr(f.recaptchaEnabled),
    };
  }

  const XFRAME_OPTIONS = [
    { value: 'DENY', label: 'DENY' },
    { value: 'SAMEORIGIN', label: 'SAMEORIGIN' },
    { value: 'ALLOW-FROM', label: 'ALLOW-FROM (custom)' },
  ];

  return (
    <div className="pt-6 space-y-6">
      <Card title="Rate Limiting">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="rateLimitEnabled" label="Enable Rate Limiting"
            checked={f.rateLimitEnabled} onChange={(v) => patch('rateLimitEnabled', v)} />
          {f.rateLimitEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
              <Input id="rateLimitPerMinute" label="Max Requests / Minute" type="number" value={f.rateLimitPerMinute}
                onChange={(e) => patch('rateLimitPerMinute', e.target.value)} />
              <Input id="rateLimitPerHour" label="Max Requests / Hour" type="number" value={f.rateLimitPerHour}
                onChange={(e) => patch('rateLimitPerHour', e.target.value)} />
            </div>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="CORS & Headers">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Input id="corsAllowedOrigins" label="CORS Allowed Origins" value={f.corsAllowedOrigins}
            placeholder="https://app.example.com,https://admin.example.com"
            hint="Comma-separated list of allowed origins. Leave empty to allow all."
            onChange={(e) => patch('corsAllowedOrigins', e.target.value)} />
          <Toggle id="hstsEnabled" label="Enable HSTS"
            description="Strict-Transport-Security header — forces HTTPS."
            checked={f.hstsEnabled} onChange={(v) => patch('hstsEnabled', v)} />
          <Select id="xFrameOptions" label="X-Frame-Options" options={XFRAME_OPTIONS}
            value={f.xFrameOptions} onChange={(e) => patch('xFrameOptions', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="IP Blocking">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ blockedIps: f.blockedIps }); }} className="space-y-4">
          <Input id="blockedIps" label="Blocked IP Addresses" value={f.blockedIps}
            placeholder="192.168.1.1,10.0.0.0/8"
            hint="Comma-separated IPs or CIDR ranges. Requests from these IPs will be rejected with 403."
            onChange={(e) => patch('blockedIps', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="reCAPTCHA" subtitle="Protect forms against bots">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="recaptchaEnabled" label="Enable Google reCAPTCHA v3"
            checked={f.recaptchaEnabled} onChange={(v) => patch('recaptchaEnabled', v)} />
          {f.recaptchaEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
              <Input id="recaptchaClientKey" label="Site Key (Client)" value={f.recaptchaClientKey}
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('recaptchaClientKey', e.target.value)} />
              <Input id="recaptchaServerKey" label="Secret Key (Server)" type="password" value={f.recaptchaServerKey}
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('recaptchaServerKey', e.target.value)} />
            </div>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Cron Jobs" subtitle="Secure scheduled job endpoints">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ cronSecret: f.cronSecret }); }} className="space-y-4">
          <Input id="cronSecret" label="Cron Secret" type="password" value={f.cronSecret}
            prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
            hint="Pass as Bearer token or x-cron-secret header when calling cron endpoints."
            onChange={(e) => patch('cronSecret', e.target.value)} />
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({ settings, onSave, saving }: TabProps) {
  const [f, setF] = useState({
    pushNotificationsEnabled: b(settings.pushNotificationsEnabled),
    vapidPublicKey: settings.vapidPublicKey ?? '',
    vapidPrivateKey: settings.vapidPrivateKey ?? '',
    emailOnNewUser: b(settings.emailOnNewUser),
    slackNotificationsEnabled: b(settings.slackNotificationsEnabled),
    slackWebhookUrl: settings.slackWebhookUrl ?? '',
    adminNotificationEmail: settings.adminNotificationEmail ?? '',
  });

  function patch(key: keyof typeof f, val: string | boolean) { setF((p) => ({ ...p, [key]: val })); }

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
      <Card title="Push Notifications" subtitle="Web push via VAPID protocol">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="pushEnabled" label="Enable Web Push Notifications"
            checked={f.pushNotificationsEnabled} onChange={(v) => patch('pushNotificationsEnabled', v)} />
          {f.pushNotificationsEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <Input id="vapidPublicKey" label="VAPID Public Key" value={f.vapidPublicKey}
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('vapidPublicKey', e.target.value)} />
              <Input id="vapidPrivateKey" label="VAPID Private Key" type="password" value={f.vapidPrivateKey}
                prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
                onChange={(e) => patch('vapidPrivateKey', e.target.value)} />
            </div>
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Email Alerts" subtitle="Admin notifications sent via email">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Input id="adminNotificationEmail" label="Admin Notification Email" type="email" value={f.adminNotificationEmail}
            prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
            hint="Receives system alerts and digest reports."
            onChange={(e) => patch('adminNotificationEmail', e.target.value)} />
          <Toggle id="emailOnNewUser" label="Email on New User Registration"
            checked={f.emailOnNewUser} onChange={(v) => patch('emailOnNewUser', v)} />
          <SaveRow loading={saving} />
        </form>
      </Card>

      <Card title="Slack" subtitle="Send notifications to a Slack channel">
        <form onSubmit={(e) => { e.preventDefault(); onSave(buildPatch()); }} className="space-y-4">
          <Toggle id="slackEnabled" label="Enable Slack Notifications"
            checked={f.slackNotificationsEnabled} onChange={(v) => patch('slackNotificationsEnabled', v)} />
          {f.slackNotificationsEnabled && (
            <Input id="slackWebhookUrl" label="Slack Incoming Webhook URL" type="url" value={f.slackWebhookUrl}
              prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
              placeholder="https://hooks.slack.com/services/..."
              onChange={(e) => patch('slackWebhookUrl', e.target.value)} />
          )}
          <SaveRow loading={saving} />
        </form>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ICON = (icon: React.ReactNode) => <span className="text-sm">{icon}</span>;

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SR>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    api.get('/system/api/settings')
      .then((res) => setSettings(res.data.settings ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async (patch: SR) => {
    setSaving(true);
    setToast(null);
    try {
      await api.put('/system/api/settings', { settings: { ...settings, ...patch } });
      setSettings((prev) => ({ ...prev, ...patch }));
      setToast({ type: 'success', msg: 'Settings saved.' });
    } catch (err: any) {
      setToast({ type: 'error', msg: err.response?.data?.message ?? err.message ?? 'Failed to save.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, [settings]);

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: ICON(<FontAwesomeIcon icon={faGlobe} />),
      content: <GeneralTab settings={settings} onSave={handleSave} saving={saving} />,
    },
    {
      id: 'auth',
      label: 'Auth',
      icon: ICON(<FontAwesomeIcon icon={faUserLock} />),
      content: <AuthTab settings={settings} onSave={handleSave} saving={saving} />,
    },
    {
      id: 'email',
      label: 'Email',
      icon: ICON(<FontAwesomeIcon icon={faEnvelope} />),
      content: <EmailTab settings={settings} onSave={handleSave} saving={saving} />,
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: ICON(<FontAwesomeIcon icon={faMobile} />),
      content: <SmsTab settings={settings} onSave={handleSave} saving={saving} />,
    },
    {
      id: 'storage',
      label: 'Storage',
      icon: ICON(<FontAwesomeIcon icon={faServer} />),
      content: <StorageTab settings={settings} onSave={handleSave} saving={saving} />,
    },
    {
      id: 'payment',
      label: 'Payment',
      icon: ICON(<FontAwesomeIcon icon={faCreditCard} />),
      content: <PaymentTab settings={settings} onSave={handleSave} saving={saving} />,
    },
    {
      id: 'ai',
      label: 'AI',
      icon: ICON(<FontAwesomeIcon icon={faRobot} />),
      content: <AiTab settings={settings} onSave={handleSave} saving={saving} />,
    },
    {
      id: 'security',
      label: 'Security',
      icon: ICON(<FontAwesomeIcon icon={faShieldHalved} />),
      content: <SecurityTab settings={settings} onSave={handleSave} saving={saving} />,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: ICON(<FontAwesomeIcon icon={faBell} />),
      content: <NotificationsTab settings={settings} onSave={handleSave} saving={saving} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" subtitle="Configure global platform behaviour" />

      {toast && (
        <AlertBanner
          variant={toast.type === 'success' ? 'success' : 'error'}
          message={toast.msg}
          dismissible
        />
      )}

      <TabGroup tabs={tabs} lazy label="System settings sections" />
    </div>
  );
}

'use client';
import { useState } from 'react';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import type { UpsertSamlConfigInput } from '@/modules/auth_saml/auth_saml.dto';

/**
 * Subset of SafeSamlConfig / SafeSystemSamlConfig that this form consumes.
 * Both scopes share these fields, so the form is scope-agnostic.
 */
export type SamlConfigFormValues = {
  isEnabled: boolean;
  idpEntityId: string;
  idpSsoUrl: string;
  idpCertificate: string;
  emailAttribute: string;
  nameAttribute: string;
  allowIdpInitiated: boolean;
  signRequests: boolean;
  nameIdFormat: string | null;
};

type Props = {
  /** Optional — only used by callers that want to thread it through. */
  tenantId?: string;
  /** Copy: 'this tenant' (default) or 'the system'. */
  scopeLabel?: string;
  config: SamlConfigFormValues | null;
  onSave: (input: UpsertSamlConfigInput) => Promise<void>;
  saving: boolean;
  error: string | null;
};

export function SamlConfigForm({ config, onSave, saving, error, scopeLabel = 'this tenant' }: Props) {
  const [f, setF] = useState<UpsertSamlConfigInput>({
    isEnabled: config?.isEnabled ?? false,
    idpEntityId: config?.idpEntityId ?? '',
    idpSsoUrl: config?.idpSsoUrl ?? '',
    idpCertificate: config?.idpCertificate ?? '',
    emailAttribute: config?.emailAttribute ?? 'email',
    nameAttribute: config?.nameAttribute ?? 'name',
    allowIdpInitiated: config?.allowIdpInitiated ?? false,
    signRequests: config?.signRequests ?? false,
    nameIdFormat: config?.nameIdFormat ?? 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) {
    setF((p) => ({ ...p, [key]: val }));
  }

  return (
    <div className="space-y-6 pt-6">
      {error && <AlertBanner variant="error" message={error} />}

      <Card title="SAML Status" subtitle={`Enable or disable SAML SSO for ${scopeLabel}`}>
        <Toggle
          id="saml-enabled"
          label="Enable SAML SSO"
          description="Allows members to log in via your Identity Provider"
          checked={f.isEnabled ?? false}
          onChange={(v) => patch('isEnabled', v)}
        />
      </Card>

      <Card
        title="Identity Provider Settings"
        subtitle="Connection details provided by your IdP (Okta, Azure AD, etc.)"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(f); }}
          className="space-y-4"
        >
          <Input
            id="idpEntityId"
            label="IdP Entity ID"
            placeholder="https://idp.example.com/sso/saml2"
            value={f.idpEntityId ?? ''}
            onChange={(e) => patch('idpEntityId', e.target.value)}
            required
          />
          <Input
            id="idpSsoUrl"
            label="IdP SSO URL"
            placeholder="https://idp.example.com/sso/saml2/login"
            value={f.idpSsoUrl ?? ''}
            onChange={(e) => patch('idpSsoUrl', e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              IdP Certificate (PEM or Base64)
            </label>
            <textarea
              className="textarea textarea-bordered w-full font-mono text-xs min-h-32 resize-y bg-surface-secondary"
              placeholder="Paste the public certificate from your IdP..."
              value={f.idpCertificate ?? ''}
              onChange={(e) => patch('idpCertificate', e.target.value)}
              required
            />
            <p className="text-xs text-text-disabled">
              Include or omit the -----BEGIN CERTIFICATE----- header — both formats are accepted.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save IdP Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

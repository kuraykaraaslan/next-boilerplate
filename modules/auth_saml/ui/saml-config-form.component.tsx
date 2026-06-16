'use client';
import { useState } from 'react';
import { Card } from '@nb/common/ui/card.component';
import { Input } from '@nb/common/ui/input.component';
import { Button } from '@nb/common/ui/button.component';
import { Toggle } from '@nb/common/ui/toggle.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import type { UpsertSamlConfigInput } from '@nb/auth_saml/server/auth_saml.dto';

/**
 * Subset of SafeSamlConfig that this form consumes.
 * Tenant-agnostic: works for any tenant including the root tenant.
 */
export type SamlConfigFormValues = {
  isEnabled: boolean;
  idpEntityId: string;
  idpSsoUrl: string;
  idpCertificate: string;
  emailAttribute: string;
  nameAttribute: string;
  roleAttribute?: string | null;
  allowJitProvisioning?: boolean;
  defaultMemberRole?: string | null;
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
    roleAttribute: config?.roleAttribute ?? '',
    allowJitProvisioning: config?.allowJitProvisioning ?? false,
    defaultMemberRole: config?.defaultMemberRole ?? 'USER',
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

      <Card
        title="Just-In-Time Provisioning"
        subtitle="Automatically create users and tenant memberships from successful SAML assertions"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(f); }}
          className="space-y-4"
        >
          <Toggle
            id="allowJitProvisioning"
            label="Enable Just-In-Time provisioning"
            description="Unknown users that authenticate via your IdP will be auto-provisioned into this tenant."
            checked={f.allowJitProvisioning ?? false}
            onChange={(v) => patch('allowJitProvisioning', v)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="defaultMemberRole"
              label="Default member role"
              placeholder="USER"
              value={f.defaultMemberRole ?? ''}
              onChange={(e) => patch('defaultMemberRole', e.target.value)}
              hint="Role assigned to JIT-provisioned members when no role attribute is mapped. Allowed: OWNER, ADMIN, USER."
            />
            <Input
              id="roleAttribute"
              label="Role attribute name (optional)"
              placeholder="role"
              value={f.roleAttribute ?? ''}
              onChange={(e) => patch('roleAttribute', e.target.value)}
              hint="SAML attribute carrying the user's role. Values containing 'owner' map to OWNER, 'admin' to ADMIN."
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save Provisioning Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

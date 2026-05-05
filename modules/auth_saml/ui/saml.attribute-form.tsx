'use client';
import { useState } from 'react';
import { Card } from '@/modules/ui/Card';
import { Input } from '@/modules/ui/Input';
import { Button } from '@/modules/ui/Button';
import { Toggle } from '@/modules/ui/Toggle';
import { Select } from '@/modules/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { SAML_NAME_ID_FORMATS } from '../auth_saml.enums';
import type { SafeSamlConfig } from '../auth_saml.types';
import type { UpsertSamlConfigInput } from '../auth_saml.dto';

type Props = {
  config: SafeSamlConfig | null;
  onSave: (input: UpsertSamlConfigInput) => Promise<void>;
  saving: boolean;
};

const NAME_ID_OPTIONS = Object.entries(SAML_NAME_ID_FORMATS).map(([label, value]) => ({
  label: label.charAt(0) + label.slice(1).toLowerCase().replace(/_/g, ' '),
  value,
}));

export function SamlAttributeForm({ config, onSave, saving }: Props) {
  const [f, setF] = useState({
    emailAttribute: config?.emailAttribute ?? 'email',
    nameAttribute: config?.nameAttribute ?? 'name',
    allowIdpInitiated: config?.allowIdpInitiated ?? false,
    signRequests: config?.signRequests ?? false,
    nameIdFormat: config?.nameIdFormat ?? SAML_NAME_ID_FORMATS.EMAIL,
  });

  function patch<K extends keyof typeof f>(key: K, val: (typeof f)[K]) {
    setF((p) => ({ ...p, [key]: val }));
  }

  return (
    <div className="space-y-6 pt-6">
      <Card
        title="Attribute Mapping"
        subtitle="Map SAML assertion attributes to user profile fields"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(f); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="emailAttribute"
              label="Email Attribute"
              placeholder="email"
              value={f.emailAttribute}
              onChange={(e) => patch('emailAttribute', e.target.value)}
              hint="Attribute name from your IdP that contains the user email"
            />
            <Input
              id="nameAttribute"
              label="Name Attribute"
              placeholder="name"
              value={f.nameAttribute}
              onChange={(e) => patch('nameAttribute', e.target.value)}
              hint="Attribute name for the user's display name"
            />
          </div>

          <Select
            id="nameIdFormat"
            label="NameID Format"
            value={f.nameIdFormat ?? SAML_NAME_ID_FORMATS.EMAIL}
            onChange={(e) => patch('nameIdFormat', e.target.value)}
            options={NAME_ID_OPTIONS}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save Mapping
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Advanced Options">
        <div className="space-y-4">
          <Toggle
            id="allow-idp-initiated"
            label="Allow IdP-initiated SSO"
            description="Permit logins started from the IdP dashboard without an SP request"
            checked={f.allowIdpInitiated}
            onChange={(v) => { patch('allowIdpInitiated', v); onSave({ ...f, allowIdpInitiated: v }); }}
          />
          <Toggle
            id="sign-requests"
            label="Sign Authentication Requests"
            description="Digitally sign SAMLRequests using the SP private key"
            checked={f.signRequests}
            onChange={(v) => { patch('signRequests', v); onSave({ ...f, signRequests: v }); }}
          />
        </div>
      </Card>
    </div>
  );
}

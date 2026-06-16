import type { SettingFieldDef } from '@nb/setting/server/setting-fields.types';
import {
  AUTH_SSO_SETTING_KEYS,
  SSO_BYO_CLIENT_ID,
  SSO_BYO_CLIENT_SECRET,
  SSO_BYO_REDIRECT_URI,
} from './auth_sso.setting.keys';

// Providers exposed in the admin UI for Bring-Your-Own OAuth credentials. These
// are the providers most commonly run under a tenant's own OAuth app; the
// resolver (auth_sso.config.service.ts) supports every provider via the dynamic
// `ssoClientId:<provider>` key shape, but the UI surfaces the common set.
const BYO_PROVIDERS: { id: string; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
  { id: 'microsoft', label: 'Microsoft' },
  { id: 'apple', label: 'Apple' },
  { id: 'linkedin', label: 'LinkedIn' },
];

function byoFields(provider: { id: string; label: string }): SettingFieldDef[] {
  const group = `${provider.label} OAuth App`;
  return [
    {
      key: SSO_BYO_CLIENT_ID(provider.id),
      label: `${provider.label} Client ID`,
      description: `This tenant's own ${provider.label} OAuth client ID. Leave blank to use the platform-wide app.`,
      group,
      type: 'text',
      placeholder: 'Leave blank for platform default',
    },
    {
      key: SSO_BYO_CLIENT_SECRET(provider.id),
      label: `${provider.label} Client Secret`,
      description: `This tenant's own ${provider.label} OAuth client secret. Stored encrypted at rest.`,
      group,
      type: 'secret',
    },
    {
      key: SSO_BYO_REDIRECT_URI(provider.id),
      label: `${provider.label} Redirect URI override`,
      description: `Optional. Override the OAuth redirect_uri (must match the redirect registered in the tenant's ${provider.label} app).`,
      group,
      type: 'url',
      placeholder: 'https://app.tenant.example.com/api/auth/callback/' + provider.id,
    },
  ];
}

// UI metadata for the SSO settings page.
export const AUTH_SSO_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: AUTH_SSO_SETTING_KEYS.TENANT_RETURN_PATH,
    label: 'Fallback Return Path',
    description:
      'App-relative path users are sent to when an SSO link state is invalid or expired. Defaults to this tenant\'s /admin/me. Must start with a single "/".',
    group: 'General',
    type: 'text',
    placeholder: '/admin/me',
  },
  {
    key: AUTH_SSO_SETTING_KEYS.CLIENT_SECRET_EXPIRY_DAYS,
    label: 'OAuth Client Secret Expiry (days)',
    description:
      'How many days after a BYO OAuth client secret is set it is treated as near-expiry, emitting an audit event + metric. 0 = no expiry tracking.',
    group: 'General',
    type: 'number',
    defaultValue: '0',
    placeholder: '0',
  },
  ...BYO_PROVIDERS.flatMap(byoFields),
];

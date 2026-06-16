'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { Card } from '@nb/common/ui/card.component';
import { Button } from '@nb/common/ui/button.component';
import { Badge } from '@nb/common/ui/badge.component';
import { Spinner } from '@nb/common/ui/spinner.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { Modal } from '@nb/common/ui/modal.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faUnlink, faPlus, faBuildingShield, faLandmark } from '@fortawesome/free-solid-svg-icons';
import { SSO_PROVIDERS, providerMeta, type OAuthProvider } from '@nb/auth/ui/o-auth-buttons.component';

type Connectable = OAuthProvider | 'saml';

type AccountGroup = 'social' | 'enterprise' | 'government';

type SocialAccount = {
  provider: string;
  providerId: string;
  profilePicture?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Enrichment from the API (optional — fall back gracefully if absent).
  kind?: 'oauth' | 'saml' | 'acs';
  group?: AccountGroup;
  displayName?: string;
  iconSlug?: string;
  country?: string;
  protocol?: 'oidc' | 'saml';
  tokenExpired?: boolean;
};

function providerLabel(p: string): string {
  if (p === 'saml') return 'SAML SSO';
  if (p.startsWith('acs:')) return p.slice('acs:'.length);
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

/** Friendly label, preferring the server-enriched displayName. */
function accountLabel(acc: SocialAccount): string {
  return acc.displayName ?? providerLabel(acc.provider);
}

/** Which display group an account belongs to (falls back to provider parsing). */
function accountGroup(acc: SocialAccount): AccountGroup {
  if (acc.group) return acc.group;
  if (acc.provider === 'saml') return 'enterprise';
  if (acc.provider.startsWith('acs:')) return 'government';
  return 'social';
}

/** Icon for an account row, keyed on its group/provider. */
function accountIcon(acc: SocialAccount) {
  const group = accountGroup(acc);
  if (group === 'enterprise') return <FontAwesomeIcon icon={faBuildingShield} className="w-4 h-4" />;
  if (group === 'government') return <FontAwesomeIcon icon={faLandmark} className="w-4 h-4" />;
  const meta = providerMeta[acc.provider as OAuthProvider];
  if (meta) return <span className={meta.iconClass}>{meta.icon}</span>;
  return <span className="text-sm font-bold">{accountLabel(acc).charAt(0).toUpperCase()}</span>;
}

const GROUP_SECTIONS: { key: AccountGroup; title: string }[] = [
  { key: 'social', title: 'Social logins' },
  { key: 'enterprise', title: 'Enterprise SSO' },
  { key: 'government', title: 'Government identities' },
];

export type SocialAccountsPanelProps = {
  /**
   * Base URL for the auth API endpoints. Defaults to system-scope.
   * For tenant me pages, pass `/tenant/${tenantId}/api/auth`.
   */
  apiBase?: string;
};

export function SocialAccountsPanel({
  apiBase = '/system/api/auth',
}: SocialAccountsPanelProps = {}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [available, setAvailable] = useState<OAuthProvider[]>([]);
  const [samlEnabled, setSamlEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [connectingProvider, setConnecting] = useState<string | null>(null);
  const [confirmProvider, setConfirm] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsRes, availableRes, samlRes] = await Promise.all([
        api.get(`${apiBase}/me/social-accounts`),
        api.get(`${apiBase}/sso`).catch(() => ({ data: { providers: [] } })),
        api.get(`${apiBase}/saml/status`).catch(() => ({ data: { enabled: false } })),
      ]);
      setAccounts(accountsRes.data.accounts ?? []);
      setAvailable((availableRes.data.providers ?? []) as OAuthProvider[]);
      setSamlEnabled(Boolean(samlRes.data?.enabled));
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load social accounts.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { refresh(); }, [refresh]);

  // Surface ?linked / ?linkError from the OAuth/SAML round-trip.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const linked = params.get('linked');
    const linkError = params.get('linkError');
    if (linked) {
      setNotice(`${providerLabel(linked)} connected successfully.`);
      params.delete('linked');
    }
    if (linkError) {
      setError(linkError);
      params.delete('linkError');
    }
    if (linked || linkError) {
      const qs = params.toString();
      window.history.replaceState(
        {},
        '',
        window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash,
      );
    }
  }, []);

  async function handleConnect(provider: Connectable) {
    setError('');
    setConnecting(provider);
    try {
      const endpoint = `${apiBase}/me/social-accounts/connect/${provider}`;
      const res = await api.get(endpoint);
      const url = res.data?.url;
      if (!url) throw new Error('No connect URL returned.');
      window.location.href = url;
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Failed to start connection.');
      setConnecting(null);
    }
  }

  async function handleUnlink(provider: string) {
    setUnlinking(true);
    try {
      // Government providers are colon-keyed (`acs:tr_edevlet`) — encode for the path.
      await api.delete(`${apiBase}/me/social-accounts/${encodeURIComponent(provider)}`);
      setAccounts((p) => p.filter((a) => a.provider !== provider));
      setConfirm(null);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to unlink account.');
    } finally {
      setUnlinking(false);
    }
  }

  const linkedSet = new Set(accounts.map((a) => a.provider));
  // OAuth providers the operator has enabled and the user hasn't already linked.
  const connectableOAuth: Connectable[] = SSO_PROVIDERS.filter(
    (p) => available.includes(p) && !linkedSet.has(p),
  );
  // SAML appears in the connectable list only when it's enabled at this scope
  // AND the user doesn't already have a SAML identity linked.
  const connectable: Connectable[] = [
    ...connectableOAuth,
    ...(samlEnabled && !linkedSet.has('saml') ? (['saml'] as const) : []),
  ];

  return (
    <>
      <Card title="Connected Accounts" subtitle="Federated identities linked to your account">
        {error && <AlertBanner variant="error" message={error} className="mb-4" dismissible />}
        {notice && <AlertBanner variant="success" message={notice} className="mb-4" dismissible />}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : (
          <>
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-text-secondary">
                <FontAwesomeIcon icon={faLink} className="w-8 h-8 opacity-30" />
                <p className="text-sm">No connected accounts</p>
              </div>
            ) : (
              <div className="space-y-5">
                {GROUP_SECTIONS.map(({ key, title }) => {
                  const inGroup = accounts.filter((a) => accountGroup(a) === key);
                  if (inGroup.length === 0) return null;
                  return (
                    <div key={key}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">{title}</p>
                      <div className="divide-y divide-border">
                        {inGroup.map((acc) => (
                          <div key={acc.provider} className="flex items-center justify-between gap-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary text-sm font-bold shrink-0">
                                {accountIcon(acc)}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-text-primary">{accountLabel(acc)}</p>
                                  <Badge variant="success" size="sm" dot>Connected</Badge>
                                  {acc.tokenExpired && (
                                    <Badge variant="warning" size="sm">Token expired</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-text-secondary truncate">{acc.providerId}</p>
                                {acc.createdAt && (
                                  <p className="text-xs text-text-disabled">
                                    Since {new Date(acc.createdAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost"
                              className="!text-error shrink-0"
                              onClick={() => setConfirm(acc.provider)}>
                              <FontAwesomeIcon icon={faUnlink} className="w-3.5 h-3.5 mr-1" />
                              Unlink
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {connectable.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-text-secondary mb-2">
                  Connect a new provider — only allowed when the provider account uses your email.
                </p>
                <div className="flex flex-wrap gap-2">
                  {connectable.map((p) => (
                    <Button key={p} size="sm" variant="outline"
                      loading={connectingProvider === p}
                      disabled={connectingProvider !== null}
                      onClick={() => handleConnect(p)}>
                      <FontAwesomeIcon
                        icon={p === 'saml' ? faBuildingShield : faPlus}
                        className="w-3 h-3 mr-1"
                      />
                      {providerLabel(p)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={!!confirmProvider}
        onClose={() => setConfirm(null)}
        title="Unlink Account"
        description={`Are you sure you want to unlink your ${
          confirmProvider
            ? accountLabel(accounts.find((a) => a.provider === confirmProvider) ?? { provider: confirmProvider, providerId: '' })
            : ''
        } account?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={unlinking}>Cancel</Button>
            <Button variant="danger" loading={unlinking}
              onClick={() => confirmProvider && handleUnlink(confirmProvider)}>
              Unlink
            </Button>
          </>
        }
      />
    </>
  );
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { Card } from '@/modules_next/common/ui/Card';
import { Button } from '@/modules_next/common/ui/Button';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faUnlink, faPlus, faBuildingShield } from '@fortawesome/free-solid-svg-icons';
import { SSO_PROVIDERS, type OAuthProvider } from '@/modules_next/auth/ui/OAuthButtons';

type Connectable = OAuthProvider | 'saml';

type SocialAccount = {
  provider: string;
  providerId: string;
  profilePicture?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function providerLabel(p: string): string {
  if (p === 'saml') return 'SAML SSO';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

export function SocialAccountsPanel() {
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
        api.get('/system/api/auth/me/social-accounts'),
        api.get('/system/api/auth/sso').catch(() => ({ data: { providers: [] } })),
        api.get('/system/api/auth/saml/status').catch(() => ({ data: { enabled: false } })),
      ]);
      setAccounts(accountsRes.data.accounts ?? []);
      setAvailable((availableRes.data.providers ?? []) as OAuthProvider[]);
      setSamlEnabled(Boolean(samlRes.data?.enabled));
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load social accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      const endpoint = provider === 'saml'
        ? '/system/api/auth/me/social-accounts/connect/saml'
        : `/system/api/auth/me/social-accounts/connect/${provider}`;
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
      await api.delete(`/system/api/auth/me/social-accounts/${provider}`);
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
              <div className="divide-y divide-border">
                {accounts.map((acc) => (
                  <div key={acc.provider} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary text-sm font-bold shrink-0">
                        {acc.provider === 'saml'
                          ? <FontAwesomeIcon icon={faBuildingShield} className="w-4 h-4" />
                          : acc.provider.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary">{providerLabel(acc.provider)}</p>
                          <Badge variant="success" size="sm" dot>Connected</Badge>
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
        description={`Are you sure you want to unlink your ${confirmProvider ? providerLabel(confirmProvider) : ''} account?`}
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

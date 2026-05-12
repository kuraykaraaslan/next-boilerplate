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
import { faLink, faUnlink } from '@fortawesome/free-solid-svg-icons';

type SocialAccount = {
  provider: string;
  providerUserId: string;
  email?: string | null;
  name?: string | null;
  connectedAt?: string | null;
};

export function SocialAccountsPanel() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [confirmProvider, setConfirm] = useState<string | null>(null);
  const [unlinking, setUnlinking]     = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/api/auth/me/social-accounts');
      setAccounts(res.data.socialAccounts ?? []);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load social accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

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

  const providerLabel = (p: string) =>
    p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();

  return (
    <>
      <Card title="Connected Accounts" subtitle="OAuth providers linked to your account">
        {error && <AlertBanner variant="error" message={error} className="mb-4" />}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-text-secondary">
            <FontAwesomeIcon icon={faLink} className="w-8 h-8 opacity-30" />
            <p className="text-sm">No connected accounts</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {accounts.map((acc) => (
              <div key={acc.provider} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary text-sm font-bold shrink-0">
                    {acc.provider.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{providerLabel(acc.provider)}</p>
                      <Badge variant="success" size="sm" dot>Connected</Badge>
                    </div>
                    <p className="text-xs text-text-secondary truncate">
                      {acc.name ?? acc.email ?? acc.providerUserId}
                    </p>
                    {acc.connectedAt && (
                      <p className="text-xs text-text-disabled">
                        Since {new Date(acc.connectedAt).toLocaleDateString()}
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

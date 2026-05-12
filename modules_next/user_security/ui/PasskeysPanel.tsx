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
import { faFingerprint, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

type Passkey = {
  credentialId: string;
  label?: string;
  createdAt: string;
  lastUsedAt?: string | null;
  transports?: string[];
};

export function PasskeysPanel() {
  const [passkeys, setPasskeys]   = useState<Passkey[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [registering, setReg]     = useState(false);
  const [regError, setRegError]   = useState('');
  const [deletingId, setDel]      = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchPasskeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/api/auth/me/security/passkeys');
      setPasskeys(res.data.passkeys ?? []);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load passkeys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPasskeys(); }, [fetchPasskeys]);

  async function handleRegister() {
    setReg(true);
    setRegError('');
    try {
      const optRes = await api.get('/system/api/auth/me/security/passkeys/register');
      const options = optRes.data;

      // Dynamically import browser client — only available on client, package may not be installed
      let response: unknown;
      try {
        const { startRegistration } = await import(/* webpackIgnore: true */ '@simplewebauthn/browser' as string);
        response = await (startRegistration as (o: unknown) => Promise<unknown>)(options);
      } catch {
        throw new Error('@simplewebauthn/browser is not installed. Run: npm install @simplewebauthn/browser');
      }

      await api.post('/system/api/auth/me/security/passkeys/register/verify', {
        response,
        label: `Passkey — ${new Date().toLocaleDateString()}`,
      });
      await fetchPasskeys();
    } catch (e: any) {
      setRegError(e?.message ?? e?.response?.data?.message ?? 'Passkey registration failed.');
    } finally {
      setReg(false);
    }
  }

  async function handleDelete(credentialId: string) {
    setDel(credentialId);
    try {
      await api.delete(`/system/api/auth/me/security/passkeys/${credentialId}`);
      setPasskeys((p) => p.filter((pk) => pk.credentialId !== credentialId));
      setConfirmId(null);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to remove passkey.');
    } finally {
      setDel(null);
    }
  }

  return (
    <>
      <Card
        title="Passkeys"
        subtitle="Biometric or hardware key authentication"
        headerRight={
          <Button size="sm" variant="outline" onClick={handleRegister} loading={registering}
            iconLeft={<FontAwesomeIcon icon={faPlus} />}>
            Add Passkey
          </Button>
        }
      >
        {error && <AlertBanner variant="error" message={error} className="mb-4" />}
        {regError && <AlertBanner variant="error" message={regError} className="mb-4" />}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : passkeys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-text-secondary">
            <FontAwesomeIcon icon={faFingerprint} className="w-8 h-8 opacity-30" />
            <p className="text-sm">No passkeys registered</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {passkeys.map((pk) => (
              <div key={pk.credentialId} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FontAwesomeIcon icon={faFingerprint} className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{pk.label ?? 'Passkey'}</p>
                    <p className="text-xs text-text-secondary">
                      Added {new Date(pk.createdAt).toLocaleDateString()}
                      {pk.lastUsedAt && ` · Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                    </p>
                    {pk.transports && pk.transports.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {pk.transports.map((t) => (
                          <Badge key={t} variant="neutral" size="sm">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost"
                  className="!text-error shrink-0"
                  onClick={() => setConfirmId(pk.credentialId)}>
                  <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Remove Passkey"
        description="Are you sure you want to remove this passkey? You won't be able to use it to sign in."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmId(null)} disabled={!!deletingId}>Cancel</Button>
            <Button variant="danger" loading={!!deletingId}
              onClick={() => confirmId && handleDelete(confirmId)}>
              Remove
            </Button>
          </>
        }
      />
    </>
  );
}

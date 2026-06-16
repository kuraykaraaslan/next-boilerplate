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
import { faFingerprint, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import type { StoredPasskey } from '@nb/user_security/server/user_security.types';

type Passkey = StoredPasskey;

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

      const { startRegistration } = await import('@simplewebauthn/browser');
      const response = await startRegistration({ optionsJSON: options });

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

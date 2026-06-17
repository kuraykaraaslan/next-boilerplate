'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SigningCertificatesBindModal } from './signing-certificates-bind-modal.component';

type BoundCert = {
  signingCertificateId: string;
  providerName: string;
  country: string;
  commonName: string | null;
  certSerialHex: string;
  issuerDN: string;
  loa: 'low' | 'substantial' | 'high';
  notBefore: string;
  notAfter: string;
  boundAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export function SigningCertificatesPanel() {
  const [certs, setCerts]     = useState<BoundCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [bindOpen, setBindOpen] = useState(false);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/api/auth/me/security/e-signature');
      setCerts((res.data?.data ?? []) as BoundCert[]);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setError(ax.response?.data?.error?.message ?? 'Failed to load signing certificates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCerts(); }, [fetchCerts]);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await api.delete(`/system/api/auth/me/security/e-signature/${id}`);
      setCerts((all) => all.filter((c) => c.signingCertificateId !== id));
      setConfirmId(null);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setError(ax.response?.data?.error?.message ?? 'Failed to revoke certificate.');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <>
      <Card
        title="Signing Certificates"
        subtitle="Electronic signatures bound to your account (Mobile signature, eIDAS QSCD, …)"
        headerRight={
          <Button size="sm" variant="outline" onClick={() => setBindOpen(true)} iconLeft={<FontAwesomeIcon icon={faPlus} />}>
            Bind certificate
          </Button>
        }
      >
        {error && <AlertBanner variant="error" message={error} className="mb-4" />}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : certs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-text-secondary">
            <FontAwesomeIcon icon={faIdCard} className="w-8 h-8 opacity-30" />
            <p className="text-sm">No signing certificates bound yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {certs.map((c) => (
              <div key={c.signingCertificateId} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FontAwesomeIcon icon={faIdCard} className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{c.commonName ?? 'Unnamed certificate'}</p>
                    <p className="text-xs text-text-secondary truncate">{c.providerName} · {c.country} · serial {c.certSerialHex.slice(0, 16)}…</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="neutral" size="sm">LoA: {c.loa}</Badge>
                      <Badge variant="neutral" size="sm">Valid until {new Date(c.notAfter).toLocaleDateString()}</Badge>
                      {c.revokedAt && <Badge variant="error" size="sm">Revoked</Badge>}
                    </div>
                  </div>
                </div>
                {!c.revokedAt && (
                  <Button size="sm" variant="ghost" className="!text-error shrink-0" onClick={() => setConfirmId(c.signingCertificateId)}>
                    <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <SigningCertificatesBindModal
        open={bindOpen}
        onClose={() => setBindOpen(false)}
        onSuccess={fetchCerts}
      />

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Revoke signing certificate"
        description="Are you sure you want to revoke this certificate? You won't be able to sign in with it anymore."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmId(null)} disabled={!!revokingId}>Cancel</Button>
            <Button variant="danger" loading={!!revokingId} onClick={() => confirmId && handleRevoke(confirmId)}>Revoke</Button>
          </>
        }
      />
    </>
  );
}

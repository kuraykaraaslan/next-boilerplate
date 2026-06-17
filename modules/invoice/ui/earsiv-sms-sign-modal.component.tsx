'use client';
import { useCallback, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';

interface Props {
  open: boolean;
  tenantId: string;
  unsignedCount: number;
  onClose(): void;
  onSigned(count: number): void;
}

export function EarsivSmsSignModal({ open, tenantId, unsignedCount, onClose, onSigned }: Props) {
  const [oid, setOid] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setOid(null);
    setCode('');
    setError(null);
    onClose();
  }

  const sendCode = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/tenant/${tenantId}/api/invoices/earsiv/sms/send`);
      setOid(res.data.oid);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'SMS kodu gönderilemedi');
    } finally {
      setBusy(false);
    }
  }, [tenantId]);

  const verifyCode = useCallback(async () => {
    if (!oid || !code) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/tenant/${tenantId}/api/invoices/earsiv/sms/verify`, { oid, code });
      setOid(null);
      setCode('');
      setError(null);
      onClose();
      onSigned(res.data.signed ?? 0);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Could not verify the code');
    } finally {
      setBusy(false);
    }
  }, [tenantId, oid, code, onClose, onSigned]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Sign e-Arşiv invoices via SMS"
      description="GİB sends a one-time code to your registered phone to legally finalize the created e-Arşiv drafts."
      footer={
        oid ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button loading={busy} disabled={!code} onClick={verifyCode}>Verify &amp; sign</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button loading={busy} onClick={sendCode}>Send code</Button>
          </div>
        )
      }
    >
      <div className="space-y-3">
        {error && <AlertBanner variant="error" message={error} />}
        <p className="text-sm text-text-secondary">
          {unsignedCount} draft{unsignedCount === 1 ? '' : 's'} will be signed.
        </p>
        {oid && (
          <Input
            id="earsivSmsCode"
            label="SMS code"
            value={code}
            inputMode="numeric"
            placeholder="6-digit code"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        )}
      </div>
    </Modal>
  );
}

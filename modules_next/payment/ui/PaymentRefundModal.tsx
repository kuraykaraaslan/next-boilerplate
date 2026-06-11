'use client';
import { useState } from 'react';
import api from '@/modules_next/common/axios';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons';

interface Props {
  open: boolean;
  tenantId: string;
  paymentId: string;
  paymentAmount: number;
  currency: string;
  onClose(): void;
  onRefunded(): void;
}

export function PaymentRefundModal({ open, tenantId, paymentId, paymentAmount, currency, onClose, onRefunded }: Props) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding]       = useState(false);
  const [refundError, setRefundError]   = useState('');

  function handleClose() {
    setRefundAmount('');
    setRefundError('');
    onClose();
  }

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    setRefunding(true);
    setRefundError('');
    try {
      await api.post(`/tenant/${tenantId}/api/payments/${paymentId}/refund`, {
        amount: refundAmount ? Number(refundAmount) : undefined,
      });
      toast.success('Refund processed.');
      handleClose();
      onRefunded();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setRefundError(err?.response?.data?.message ?? err?.message ?? 'Refund failed.');
    } finally {
      setRefunding(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Issue Refund"
      description={`Payment of ${paymentAmount} ${currency}`}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={refunding}>Cancel</Button>
          <Button form="refund-form" type="submit" loading={refunding}
            iconLeft={<FontAwesomeIcon icon={faArrowRotateLeft} />}>
            Refund
          </Button>
        </>
      }
    >
      <form id="refund-form" onSubmit={handleRefund} className="space-y-4">
        {refundError && <AlertBanner variant="error" message={refundError} />}
        <Input
          id="refund-amount"
          label={`Amount (leave empty for full refund of ${paymentAmount} ${currency})`}
          type="number"
          min="0.01"
          step="0.01"
          placeholder={String(paymentAmount)}
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
        />
      </form>
    </Modal>
  );
}

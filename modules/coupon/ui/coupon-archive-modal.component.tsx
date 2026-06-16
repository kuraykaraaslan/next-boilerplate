'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@nb/common/server/axios';
import { Modal } from '@nb/common/ui/modal.component';
import { Button } from '@nb/common/ui/button.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { toast } from '@nb/common/ui/toast.store';

interface Props {
  open: boolean;
  tenantId: string;
  couponId: string;
  couponCode: string;
  onClose(): void;
}

export function CouponArchiveModal({ open, tenantId, couponId, couponCode, onClose }: Props) {
  const router = useRouter();
  const [archiving, setArchiving]     = useState(false);
  const [archiveError, setArchiveError] = useState('');

  async function handleArchive() {
    setArchiving(true);
    setArchiveError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/coupons/${couponId}`);
      toast.success('Coupon archived.');
      router.push(`/tenant/${tenantId}/admin/coupons`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setArchiveError(e?.response?.data?.message ?? e?.message ?? 'Failed to archive coupon.');
      setArchiving(false);
    }
  }

  function handleClose() {
    setArchiveError('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Archive Coupon"
      description={`Archive coupon ${couponCode}? It will no longer be usable.`}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={archiving}>Cancel</Button>
          <Button variant="danger" onClick={handleArchive} loading={archiving}>Archive</Button>
        </>
      }
    >
      {archiveError && <AlertBanner variant="error" message={archiveError} />}
    </Modal>
  );
}

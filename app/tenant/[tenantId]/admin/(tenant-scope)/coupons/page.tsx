'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nb/common/ui/Button';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { Modal } from '@nb/common/ui/Modal';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { ServerDataTable } from '@nb/common/ui/ServerDataTable';
import { toast } from '@nb/common/ui/toast.store';
import api from '@nb/common/server/axios';
import { CouponCreateModal } from '@nb/coupon/ui/CouponCreateModal';
import { buildCouponColumns, type CouponRow } from '@nb/coupon/ui/coupon-list-columns';

const PAGE_SIZE = 25;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function CouponsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [coupons, setCoupons]     = useState<CouponRow[]>([]);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);

  const [archivingCoupon, setArchivingCoupon] = useState<CouponRow | null>(null);
  const [archiving, setArchiving]             = useState(false);
  const [archiveError, setArchiveError]       = useState('');

  const fetchCoupons = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/coupons?pageSize=100`);
      setCoupons(res.data.coupons ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load coupons.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  async function handleCreate(payload: Record<string, unknown>) {
    await api.post(`/tenant/${tenantId}/api/coupons`, payload);
    toast.success('Coupon created.');
    fetchCoupons();
  }

  async function handleArchive() {
    if (!archivingCoupon) return;
    setArchiving(true); setArchiveError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/coupons/${archivingCoupon.couponId}`);
      setArchivingCoupon(null);
      toast.success('Coupon archived.');
      fetchCoupons();
    } catch (err: unknown) {
      setArchiveError(extractMessage(err, 'Failed to archive coupon.'));
    } finally {
      setArchiving(false);
    }
  }

  const total = coupons.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = coupons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildCouponColumns({
    onEdit: (c) => router.push(`/tenant/${tenantId}/admin/coupons/${c.couponId}`),
    onArchive: (c) => { setArchiveError(''); setArchivingCoupon(c); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        subtitle="Create and manage discount codes for subscription plans."
        actions={[{ label: 'New Coupon', onClick: () => setCreateOpen(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(c) => c.couponId}
        onRowClick={(c) => router.push(`/tenant/${tenantId}/admin/coupons/${c.couponId}`)}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No coupons yet."
      />

      <CouponCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tenantId={tenantId}
        onSave={handleCreate}
      />

      <Modal
        open={!!archivingCoupon}
        onClose={() => { setArchivingCoupon(null); setArchiveError(''); }}
        title="Archive Coupon"
        description={`Archive coupon ${archivingCoupon?.code}? It will no longer be usable.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setArchivingCoupon(null); setArchiveError(''); }} disabled={archiving}>Cancel</Button>
            <Button variant="danger" onClick={handleArchive} loading={archiving}>Archive</Button>
          </>
        }
      >
        {archiveError && <AlertBanner variant="error" message={archiveError} />}
      </Modal>
    </div>
  );
}

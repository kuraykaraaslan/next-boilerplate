'use client';
import { use, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faGear } from '@fortawesome/free-solid-svg-icons';
import type { TenantMemberRole as MemberRole } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';
import { buildDomainColumns, type DomainRow } from '@kuraykaraaslan/tenant_domain/ui/domain-list-columns.component';

type SessionData = { tenantMember: { tenantMemberId: string; memberRole: MemberRole }; tenant: { name: string } };
type DnsRecord = { type: string; name: string; value: string };

const PAGE_SIZE = 25;
const APP_DOMAIN = process.env.NEXT_PUBLIC_TENANT_WILDCARD_DOMAIN ?? 'example.com';
const DNS_RECORDS: DnsRecord[] = [{ type: 'CNAME', name: 'your-domain.com', value: APP_DOMAIN }];
const DNS_COLS: TableColumn<DnsRecord>[] = [
  { key: 'type',  header: 'Type',  render: (r) => <span className="font-mono text-text-primary text-xs">{r.type}</span> },
  { key: 'name',  header: 'Name',  render: (r) => <span className="font-mono text-text-secondary text-xs">{r.name}</span> },
  { key: 'value', header: 'Value', render: (r) => <span className="font-mono text-text-secondary text-xs">{r.value}</span> },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function TenantDomainsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [domains, setDomains]   = useState<DomainRow[]>([]);
  const [session, setSession]   = useState<SessionData | null>(null);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [addOpen, setAddOpen]   = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState('');
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<DomainRow | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/domains`),
    ])
      .then(([s, d]) => { setSession(s.data); setDomains(d.data.domains ?? []); })
      .catch((err) => setFetchError(extractMessage(err, 'Failed to load domains.')))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const canManage = session?.tenantMember.memberRole === 'ADMIN' || session?.tenantMember.memberRole === 'OWNER';
  const isOwner   = session?.tenantMember.memberRole === 'OWNER';

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true); setAddError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/domains`, { domain: newDomain.trim() });
      setDomains((prev) => [res.data.domain, ...prev]);
      toast.success(`Domain "${res.data.domain.domain}" added. Verify DNS to activate.`);
      setNewDomain(''); setAddOpen(false);
    } catch (err: unknown) { setAddError(extractMessage(err, 'Failed to add domain.')); }
    finally { setAdding(false); }
  }

  async function handleVerify(domain: DomainRow) {
    setVerifying((prev) => ({ ...prev, [domain.tenantDomainId]: true }));
    try {
      const res = await api.post(`/tenant/${tenantId}/api/domains/${domain.tenantDomainId}/verify`);
      if (res.data.isVerified) {
        toast.success(res.data.message ?? 'Domain verified successfully.');
        setDomains((prev) => prev.map((d) => d.tenantDomainId === domain.tenantDomainId ? { ...d, domainStatus: 'VERIFIED' } : d));
      } else {
        toast.error(res.data.message ?? 'Verification failed. Check your DNS settings.');
      }
    } catch (err: unknown) { toast.error(extractMessage(err, 'Verification request failed.')); }
    finally { setVerifying((prev) => ({ ...prev, [domain.tenantDomainId]: false })); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/domains/${confirmDelete.tenantDomainId}`);
      setDomains((prev) => prev.filter((d) => d.tenantDomainId !== confirmDelete.tenantDomainId));
      setConfirmDelete(null); toast.success('Domain deleted.');
    } catch (err: unknown) { setDeleteError(extractMessage(err, 'Failed to delete domain.')); }
    finally { setDeleting(false); }
  }

  const total = domains.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const columns = buildDomainColumns({
    canManage: canManage ?? false,
    isOwner: isOwner ?? false,
    verifying,
    onVerify: handleVerify,
    onDelete: (d) => { setConfirmDelete(d); setDeleteError(''); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domains"
        subtitle="Custom domains connected to this organization"
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/domains/settings`, variant: 'ghost' as const },
          ...(isOwner ? [{ label: 'Add Domain', onClick: () => { setAddOpen(true); setAddError(''); setNewDomain(''); } }] : []),
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <Card title="DNS Setup Instructions" subtitle="Add a CNAME record in your DNS provider to point your custom domain to this application">
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex items-start gap-2">
            <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5 shrink-0 text-primary" />
            <p>Create a <span className="font-semibold text-text-primary">CNAME</span> record pointing to{' '}
              <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-text-primary">{APP_DOMAIN}</code>.
            </p>
          </div>
          <ServerDataTable columns={DNS_COLS} rows={DNS_RECORDS} getRowKey={(r) => r.name} page={1} totalPages={1} onPageChange={() => {}} hidePagination />
          <p className="text-xs text-text-disabled">DNS changes may take up to 48 hours to propagate.</p>
        </div>
      </Card>

      <ServerDataTable
        columns={columns}
        rows={domains.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
        getRowKey={(d) => d.tenantDomainId}
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage} loading={loading} emptyMessage="No domains configured."
      />

      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddError(''); setNewDomain(''); }}
        title="Add Domain" description="Enter the custom domain you want to connect to this organization."
        footer={<>
          <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
          <Button form="add-domain-form" type="submit" variant="primary" loading={adding}>Add Domain</Button>
        </>}
      >
        <form id="add-domain-form" onSubmit={handleAddDomain} className="space-y-3">
          {addError && <AlertBanner variant="error" message={addError} />}
          <Input id="add-domain" label="Domain name" placeholder="app.yourdomain.com" value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)} hint="Enter the full domain or subdomain." required />
        </form>
      </Modal>

      <Modal open={confirmDelete !== null} onClose={() => { setConfirmDelete(null); setDeleteError(''); }}
        title="Delete Domain" description={`Remove "${confirmDelete?.domain}" from this organization?`}
        footer={<>
          <Button variant="ghost" onClick={() => { setConfirmDelete(null); setDeleteError(''); }} disabled={deleting}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
        </>}
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
        <p className="text-sm text-text-secondary">This will permanently remove the domain. Any traffic routed through it will stop working immediately. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

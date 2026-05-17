'use client';
import { use, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faCheckCircle, faGlobe, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

type MemberRole = 'USER' | 'ADMIN' | 'OWNER';

type DomainStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'VERIFIED';

type Domain = {
  tenantDomainId: string;
  tenantId: string;
  domain: string;
  isPrimary: boolean;
  domainStatus: DomainStatus;
  verifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type SessionData = {
  tenantMember: { tenantMemberId: string; memberRole: MemberRole };
  tenant: { name: string };
};

const PAGE_SIZE = 25;

const STATUS_BADGE: Record<DomainStatus, 'success' | 'warning' | 'neutral' | 'error'> = {
  ACTIVE:   'success',
  VERIFIED: 'success',
  PENDING:  'warning',
  INACTIVE: 'neutral',
};

const STATUS_LABEL: Record<DomainStatus, string> = {
  ACTIVE:   'Active',
  VERIFIED: 'Verified',
  PENDING:  'Pending',
  INACTIVE: 'Inactive',
};

const APP_DOMAIN = process.env.NEXT_PUBLIC_TENANT_WILDCARD_DOMAIN ?? 'example.com';

type DnsRecord = { type: string; name: string; value: string };
const DNS_RECORDS: DnsRecord[] = [
  { type: 'CNAME', name: 'your-domain.com', value: APP_DOMAIN },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function TenantDomainsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [domains, setDomains]   = useState<Domain[]>([]);
  const [session, setSession]   = useState<SessionData | null>(null);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [addOpen, setAddOpen]     = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState('');

  const [verifying, setVerifying] = useState<Record<string, boolean>>({});

  const [confirmDelete, setConfirmDelete] = useState<Domain | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/domains`),
    ])
      .then(([sessionRes, domainsRes]) => {
        setSession(sessionRes.data);
        setDomains(domainsRes.data.domains ?? []);
      })
      .catch((err) => setFetchError(extractMessage(err, 'Failed to load domains.')))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const canManage =
    session?.tenantMember.memberRole === 'ADMIN' ||
    session?.tenantMember.memberRole === 'OWNER';

  const isOwner = session?.tenantMember.memberRole === 'OWNER';

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/domains`, { domain: newDomain.trim() });
      const created: Domain = res.data.domain;
      setDomains((prev) => [created, ...prev]);
      toast.success(`Domain "${created.domain}" added. Verify DNS to activate.`);
      setNewDomain('');
      setAddOpen(false);
    } catch (err: unknown) {
      setAddError(extractMessage(err, 'Failed to add domain.'));
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(domain: Domain) {
    setVerifying((prev) => ({ ...prev, [domain.tenantDomainId]: true }));
    try {
      const res = await api.post(`/tenant/${tenantId}/api/domains/${domain.tenantDomainId}/verify`);
      const isVerified: boolean = res.data.isVerified;
      const text = res.data.message ?? (isVerified
        ? 'Domain verified successfully.'
        : 'Verification failed. Check your DNS settings.');
      if (isVerified) {
        toast.success(text);
        setDomains((prev) =>
          prev.map((d) =>
            d.tenantDomainId === domain.tenantDomainId
              ? { ...d, domainStatus: 'VERIFIED' }
              : d,
          ),
        );
      } else {
        toast.error(text);
      }
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Verification request failed.'));
    } finally {
      setVerifying((prev) => ({ ...prev, [domain.tenantDomainId]: false }));
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/domains/${confirmDelete.tenantDomainId}`);
      setDomains((prev) => prev.filter((d) => d.tenantDomainId !== confirmDelete.tenantDomainId));
      setConfirmDelete(null);
      toast.success('Domain deleted.');
    } catch (err: unknown) {
      setDeleteError(extractMessage(err, 'Failed to delete domain.'));
    } finally {
      setDeleting(false);
    }
  }

  function needsVerification(status: DomainStatus) {
    return status === 'PENDING' || status === 'INACTIVE';
  }

  const total = domains.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = domains.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dnsColumns: TableColumn<DnsRecord>[] = [
    { key: 'type',  header: 'Type',  render: (r) => <span className="font-mono text-text-primary text-xs">{r.type}</span> },
    { key: 'name',  header: 'Name',  render: (r) => <span className="font-mono text-text-secondary text-xs">{r.name}</span> },
    { key: 'value', header: 'Value', render: (r) => <span className="font-mono text-text-secondary text-xs">{r.value}</span> },
  ];

  const columns: TableColumn<Domain>[] = [
    {
      key: 'domain',
      header: 'Domain',
      render: (d) => (
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faGlobe} className="shrink-0 text-text-disabled w-3.5 h-3.5" />
          <span className="font-medium text-text-primary">{d.domain}</span>
          {d.isPrimary && <Badge variant="primary">Primary</Badge>}
        </div>
      ),
    },
    {
      key: 'domainStatus',
      header: 'Status',
      render: (d) => <Badge variant={STATUS_BADGE[d.domainStatus]}>{STATUS_LABEL[d.domainStatus]}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (d) => (
        <span className="text-text-secondary">
          {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (d) => {
        const actions: Parameters<typeof RowActionsMenu>[0]['actions'] = [];
        if (canManage && needsVerification(d.domainStatus)) {
          actions.push({
            label: verifying[d.tenantDomainId] ? 'Verifying…' : 'Verify DNS',
            icon: <FontAwesomeIcon icon={faCheckCircle} />,
            onClick: () => handleVerify(d),
          });
        }
        if (isOwner && !d.isPrimary) {
          actions.push({
            label: 'Delete',
            icon: <FontAwesomeIcon icon={faTrash} />,
            onClick: () => { setConfirmDelete(d); setDeleteError(''); },
            variant: 'danger',
          });
        }
        if (actions.length === 0) return null;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu actions={actions} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domains"
        subtitle="Custom domains connected to this organization"
        actions={isOwner ? [{
          label: 'Add Domain',
          onClick: () => { setAddOpen(true); setAddError(''); setNewDomain(''); },
        }] : []}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <Card
        title="DNS Setup Instructions"
        subtitle="Add a CNAME record in your DNS provider to point your custom domain to this application"
      >
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex items-start gap-2">
            <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5 shrink-0 text-primary" />
            <p>
              To use a custom domain, create a <span className="font-semibold text-text-primary">CNAME</span> record
              in your DNS provider that points your domain to{' '}
              <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-text-primary">
                {APP_DOMAIN}
              </code>
              .
            </p>
          </div>
          <ServerDataTable
            columns={dnsColumns}
            rows={DNS_RECORDS}
            getRowKey={(r) => r.name}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
            hidePagination
          />
          <p className="text-xs text-text-disabled">
            DNS changes may take up to 48 hours to propagate. After updating your DNS, click{' '}
            <span className="font-medium text-text-secondary">Verify DNS</span> on the domain row.
          </p>
        </div>
      </Card>

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(d) => d.tenantDomainId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No domains configured."
      />

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddError(''); setNewDomain(''); }}
        title="Add Domain"
        description="Enter the custom domain you want to connect to this organization."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
            <Button form="add-domain-form" type="submit" variant="primary" loading={adding}>Add Domain</Button>
          </>
        }
      >
        <form id="add-domain-form" onSubmit={handleAddDomain} className="space-y-3">
          {addError && <AlertBanner variant="error" message={addError} />}
          <Input
            id="add-domain"
            label="Domain name"
            placeholder="app.yourdomain.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            hint="Enter the full domain or subdomain you wish to use (e.g. app.yourdomain.com)."
            required
          />
        </form>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(''); }}
        title="Delete Domain"
        description={`Remove "${confirmDelete?.domain}" from this organization?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConfirmDelete(null); setDeleteError(''); }} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
        <p className="text-sm text-text-secondary">
          This will permanently remove the domain. Any traffic routed through it will stop working
          immediately. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

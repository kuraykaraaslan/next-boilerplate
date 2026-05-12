'use client';
import { use, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faCheckCircle, faGlobe, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';

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

const STATUS_BADGE: Record<DomainStatus, 'success' | 'warning' | 'neutral' | 'error'> = {
  ACTIVE: 'success',
  VERIFIED: 'success',
  PENDING: 'warning',
  INACTIVE: 'neutral',
};

const STATUS_LABEL: Record<DomainStatus, string> = {
  ACTIVE: 'Active',
  VERIFIED: 'Verified',
  PENDING: 'Pending',
  INACTIVE: 'Inactive',
};

const APP_DOMAIN = process.env.NEXT_PUBLIC_TENANT_WILDCARD_DOMAIN ?? 'example.com';

export default function TenantDomainsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [domains, setDomains] = useState<Domain[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Add domain modal
  const [addOpen, setAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Verify DNS per-domain state
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [verifyMessages, setVerifyMessages] = useState<Record<string, { ok: boolean; text: string }>>({});

  // Delete confirm modal
  const [confirmDelete, setConfirmDelete] = useState<Domain | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/domains`),
    ])
      .then(([sessionRes, domainsRes]) => {
        setSession(sessionRes.data);
        setDomains(domainsRes.data.domains ?? []);
      })
      .catch(() => setFetchError('Failed to load domains. Please refresh.'))
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
    setAddSuccess('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/domains`, { domain: newDomain.trim() });
      const created: Domain = res.data.domain;
      setDomains((prev) => [created, ...prev]);
      setAddSuccess(`Domain "${created.domain}" added. Add the DNS records below to verify it.`);
      setNewDomain('');
      setAddOpen(false);
      setTimeout(() => setAddSuccess(''), 6000);
    } catch (err: any) {
      setAddError(err.response?.data?.message ?? err.message ?? 'Failed to add domain.');
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(domain: Domain) {
    setVerifying((prev) => ({ ...prev, [domain.tenantDomainId]: true }));
    setVerifyMessages((prev) => {
      const next = { ...prev };
      delete next[domain.tenantDomainId];
      return next;
    });
    try {
      const res = await api.post(`/tenant/${tenantId}/api/domains/${domain.tenantDomainId}/verify`);
      const isVerified: boolean = res.data.isVerified;
      setVerifyMessages((prev) => ({
        ...prev,
        [domain.tenantDomainId]: {
          ok: isVerified,
          text: res.data.message ?? (isVerified ? 'Domain verified successfully.' : 'Verification failed. Check your DNS settings.'),
        },
      }));
      if (isVerified) {
        setDomains((prev) =>
          prev.map((d) =>
            d.tenantDomainId === domain.tenantDomainId
              ? { ...d, domainStatus: 'VERIFIED' }
              : d
          )
        );
      }
    } catch (err: any) {
      setVerifyMessages((prev) => ({
        ...prev,
        [domain.tenantDomainId]: {
          ok: false,
          text: err.response?.data?.message ?? err.message ?? 'Verification request failed.',
        },
      }));
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
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? err.message ?? 'Failed to delete domain.');
    } finally {
      setDeleting(false);
    }
  }

  function needsVerification(status: DomainStatus) {
    return status === 'PENDING' || status === 'INACTIVE';
  }

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
      {addSuccess && <AlertBanner variant="success" message={addSuccess} dismissible />}

      {/* DNS Instructions Card */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-semibold text-text-primary">Type</th>
                  <th className="py-2 pr-4 text-left font-semibold text-text-primary">Name</th>
                  <th className="py-2 text-left font-semibold text-text-primary">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 pr-4 font-mono text-text-primary">CNAME</td>
                  <td className="py-2 pr-4 font-mono text-text-secondary">your-domain.com</td>
                  <td className="py-2 font-mono text-text-secondary">{APP_DOMAIN}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-disabled">
            DNS changes may take up to 48 hours to propagate. After updating your DNS, click{' '}
            <span className="font-medium text-text-secondary">Verify DNS</span> to confirm the configuration.
          </p>
        </div>
      </Card>

      {/* Domains Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : domains.length === 0 ? (
          <EmptyState
            icon={<FontAwesomeIcon icon={faGlobe} className="w-5 h-5" />}
            title="No domains configured"
            description="Add a custom domain to use with this organization."
            action={isOwner ? (
              <Button
                onClick={() => { setAddOpen(true); setAddError(''); setNewDomain(''); }}
                iconLeft={<FontAwesomeIcon icon={faPlus} />}
              >
                Add Domain
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Added</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {domains.map((domain) => {
                  const msg = verifyMessages[domain.tenantDomainId];
                  return (
                    <tr key={domain.tenantDomainId} className="hover:bg-surface-overlay transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faGlobe} className="shrink-0 text-text-disabled w-3.5 h-3.5" />
                          <span className="font-medium text-text-primary">{domain.domain}</span>
                          {domain.isPrimary && (
                            <Badge variant="primary">Primary</Badge>
                          )}
                        </div>
                        {msg && (
                          <p className={`mt-1 text-xs ${msg.ok ? 'text-success' : 'text-error'}`}>
                            {msg.text}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={STATUS_BADGE[domain.domainStatus]}>
                          {STATUS_LABEL[domain.domainStatus]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        {domain.createdAt ? new Date(domain.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canManage && needsVerification(domain.domainStatus) && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={verifying[domain.tenantDomainId] ?? false}
                              iconLeft={<FontAwesomeIcon icon={faCheckCircle} />}
                              onClick={() => handleVerify(domain)}
                            >
                              Verify DNS
                            </Button>
                          )}
                          {isOwner && !domain.isPrimary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              aria-label="Delete domain"
                              onClick={() => { setConfirmDelete(domain); setDeleteError(''); }}
                              iconLeft={<FontAwesomeIcon icon={faTrash} className="text-error" />}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Domain Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddError(''); setNewDomain(''); }}
        title="Add Domain"
        description="Enter the custom domain you want to connect to this organization."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button variant="primary" loading={adding} onClick={handleAddDomain as any}>
              Add Domain
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddDomain} className="space-y-3">
          {addError && <AlertBanner variant="error" message={addError} />}
          <Input
            id="add-domain"
            label="Domain name"
            placeholder="app.yourdomain.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            hint="Enter the full domain or subdomain you wish to use (e.g. app.yourdomain.com)."
          />
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(''); }}
        title="Delete Domain"
        description={`Remove "${confirmDelete?.domain}" from this organization?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
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

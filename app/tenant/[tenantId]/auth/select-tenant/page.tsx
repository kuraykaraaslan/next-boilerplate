'use client';
import { use, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { BrandLogo } from '@/modules_next/common/ui/BrandLogo';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faPlus, faCog, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { isRootTenant } from '@/modules/tenant/tenant.constants';

type TenantMembership = {
  tenantMemberId: string;
  memberRole: string;
  tenant: {
    tenantId: string;
    name: string;
    description: string | null;
    tenantStatus: string;
  };
};

type User = { userRole: 'GUEST' | 'USER' | 'ADMIN' };

export default function SelectTenantPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createValues, setCreateValues] = useState({ name: '', description: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/${tenantId}/api/auth/session`),
      api.get(`/tenant/${tenantId}/api/auth/me/tenants`),
    ])
      .then(([sessionRes, tenantsRes]) => {
        setUser(sessionRes.data.user);
        setTenants(tenantsRes.data.tenants ?? []);
      })
      .catch(() => setFetchError('Failed to load organizations. Please refresh.'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  function handleSelect(selectedTenantId: string) {
    setSelecting(selectedTenantId);
    window.location.href = `/tenant/${selectedTenantId}/admin/members`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createValues.name.trim()) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      // Platform-level operation: only allowed under the root tenant.
      const res = await api.post(`/tenant/${tenantId}/api/tenants/create`, {
        name: createValues.name.trim(),
        description: createValues.description.trim() || undefined,
      });
      window.location.href = `/tenant/${res.data.tenant.tenantId}/admin/members`;
    } catch (err: any) {
      setCreateError(err.response?.data?.message ?? err.message ?? 'Failed to create organization.');
      setCreateLoading(false);
    }
  }

  function closeCreate() {
    setShowCreate(false);
    setCreateError('');
    setCreateValues({ name: '', description: '' });
  }

  // Super-admin settings link only makes sense from the root tenant context.
  const showSystemSettingsLink = user?.userRole === 'ADMIN' && isRootTenant(tenantId);

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">

        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo><FontAwesomeIcon icon={faBuilding} /></BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Select Organization</h1>
          <p className="text-sm text-text-secondary">Choose a workspace to continue</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : fetchError ? (
          <AlertBanner variant="error" message={fetchError} />
        ) : tenants.length === 0 ? (
          <p className="text-center text-sm text-text-secondary py-4">
            You don&apos;t belong to any organizations yet.
          </p>
        ) : (
          <div className="space-y-2">
            {tenants.map(({ tenant, memberRole, tenantMemberId }) => (
              <button
                key={tenantMemberId}
                type="button"
                onClick={() => handleSelect(tenant.tenantId)}
                disabled={selecting !== null}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-surface-base hover:bg-surface-overlay hover:border-border-focus transition-colors px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0 text-sm font-bold">
                  {tenant.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{tenant.name}</p>
                  {tenant.description && (
                    <p className="text-xs text-text-secondary truncate">{tenant.description}</p>
                  )}
                  <p className="text-xs text-text-disabled capitalize">{memberRole.toLowerCase()}</p>
                </div>
                {selecting === tenant.tenantId
                  ? <Spinner size="sm" />
                  : <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-text-disabled shrink-0" />
                }
              </button>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-border space-y-2">
          <Button
            variant="outline"
            fullWidth
            iconLeft={<FontAwesomeIcon icon={faPlus} />}
            onClick={() => setShowCreate(true)}
          >
            Create new organization
          </Button>

          {showSystemSettingsLink && (
            <a href={`/tenant/${tenantId}/admin/settings`}>
              <Button variant="ghost" fullWidth iconLeft={<FontAwesomeIcon icon={faCog} />}>
                Platform Settings
              </Button>
            </a>
          )}
        </div>
      </div>

      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="Create Organization"
        description="Set up a new tenant workspace"
        footer={
          <>
            <Button variant="ghost" onClick={closeCreate} disabled={createLoading}>Cancel</Button>
            <Button form="create-org-form" type="submit" loading={createLoading}>Create</Button>
          </>
        }
      >
        <form id="create-org-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}
          <Input
            id="org-name"
            label="Organization Name"
            required
            placeholder="Acme Corp"
            value={createValues.name}
            onChange={(e) => setCreateValues((v) => ({ ...v, name: e.target.value }))}
          />
          <Input
            id="org-desc"
            label="Description"
            placeholder="Optional description"
            value={createValues.description}
            onChange={(e) => setCreateValues((v) => ({ ...v, description: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}

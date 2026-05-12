'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/libs/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Pagination } from '@/modules_next/common/ui/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved, faList, faBook, faExternalLink, faBuilding,
} from '@fortawesome/free-solid-svg-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type SamlTenantRow = {
  tenantId: string;
  tenantName: string;
  isEnabled: boolean;
  idpEntityId: string;
  idpSsoUrl: string;
  updatedAt: string;
};

// ─── Setup Guide Tab ──────────────────────────────────────────────────────────

function GuideTab() {
  const steps = [
    { step: 1, title: 'Log in to your Identity Provider', desc: 'Open Okta, Azure AD, Google Workspace, or any other SAML 2.0-compliant IdP.' },
    { step: 2, title: 'Create a new SAML application', desc: 'Choose "SAML 2.0" as the sign-on method. Most IdPs call this a "custom app" or "enterprise application".' },
    { step: 3, title: 'Enter the SP Metadata values', desc: "Navigate to the tenant's SAML settings page to copy the Entity ID and ACS URL, then paste them into your IdP." },
    { step: 4, title: 'Download or copy the IdP certificate', desc: 'Your IdP will provide a public X.509 certificate. Download it in PEM format.' },
    { step: 5, title: 'Configure the tenant SAML settings', desc: 'In the tenant admin panel → Settings → SAML SSO, enter the IdP Entity ID, SSO URL, and paste the certificate.' },
    { step: 6, title: 'Enable and test', desc: 'Toggle SAML SSO on and use the SP-initiated login URL to verify the flow end-to-end.' },
  ];

  const providers = [
    { name: 'Okta', url: 'https://developer.okta.com/docs/guides/saml-application-setup' },
    { name: 'Azure AD', url: 'https://learn.microsoft.com/en-us/azure/active-directory/saas-apps/tutorial-list' },
    { name: 'Google Workspace', url: 'https://support.google.com/a/answer/6087519' },
    { name: 'OneLogin', url: 'https://onelogin.com/saml' },
    { name: 'Auth0', url: 'https://auth0.com/docs/authenticate/protocols/saml' },
    { name: 'JumpCloud', url: 'https://support.jumpcloud.com/s/article/sso-saml' },
  ];

  return (
    <div className="space-y-6 pt-6">
      <Card title="Setup Guide" subtitle="How to configure SAML SSO for a tenant">
        <ol className="space-y-4 mt-2">
          {steps.map(({ step, title, desc }) => (
            <li key={step} className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mt-0.5">
                {step}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">{title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Supported Identity Providers" subtitle="Tested and compatible IdPs">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          {providers.map(({ name, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 hover:border-primary hover:bg-surface-secondary transition-colors text-sm font-medium"
            >
              {name}
              <FontAwesomeIcon icon={faExternalLink} className="w-3 h-3 text-text-disabled" />
            </a>
          ))}
        </div>
      </Card>

      <Card title="SAML Endpoints" subtitle="URL patterns used by tenants">
        <div className="overflow-x-auto">
          <table className="table table-sm text-xs w-full">
            <thead>
              <tr>
                <th>Purpose</th>
                <th>URL Pattern</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['SP Metadata', '/tenant/{tenantId}/api/auth/saml/metadata', 'GET'],
                ['SP-Initiated Login', '/tenant/{tenantId}/api/auth/saml/initiate', 'GET'],
                ['ACS (Callback)', '/tenant/{tenantId}/api/auth/saml/callback', 'POST'],
                ['Config API', '/tenant/{tenantId}/api/saml/config', 'GET / PUT / DELETE'],
              ].map(([purpose, url, method]) => (
                <tr key={url}>
                  <td className="font-medium">{purpose}</td>
                  <td className="font-mono text-text-secondary">{url}</td>
                  <td><Badge variant="info" size="sm">{method}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function OverviewTab() {
  const [rows, setRows] = useState<SamlTenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/system/api/saml/tenants', { params: { page, pageSize: PAGE_SIZE } })
      .then((res) => {
        setRows(res.data.rows ?? []);
        setTotal(res.data.total ?? 0);
      })
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error) return <AlertBanner variant="error" message={error} className="mt-6" />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FontAwesomeIcon icon={faBuilding} className="w-8 h-8" />}
        title="No tenants with SAML configured"
        description="When a tenant admin configures SAML SSO, it will appear here."
        className="mt-10"
      />
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="pt-6 space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Status</th>
              <th>IdP Entity ID</th>
              <th>Last Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tenantId} className="hover:bg-surface-secondary">
                <td className="font-medium">{r.tenantName}</td>
                <td>
                  {r.isEnabled
                    ? <Badge variant="success" size="sm">Enabled</Badge>
                    : <Badge variant="neutral" size="sm">Disabled</Badge>}
                </td>
                <td className="font-mono text-xs text-text-secondary max-w-xs truncate">
                  {r.idpEntityId || '—'}
                </td>
                <td className="text-xs text-text-secondary">
                  {new Date(r.updatedAt).toLocaleDateString()}
                </td>
                <td>
                  <a
                    href={`/tenant/${r.tenantId}/admin/settings/saml`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Configure
                    <FontAwesomeIcon icon={faExternalLink} className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemSamlPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SAML SSO"
        subtitle="Monitor and manage SAML configuration across all tenants"
      />

      <TabGroup
        label="SAML Administration"
        tabs={[
          {
            id: 'overview',
            label: 'Tenant Overview',
            icon: <FontAwesomeIcon icon={faList} className="w-3.5 h-3.5" />,
            content: <OverviewTab />,
          },
          {
            id: 'guide',
            label: 'Setup Guide',
            icon: <FontAwesomeIcon icon={faBook} className="w-3.5 h-3.5" />,
            content: <GuideTab />,
          },
        ]}
      />
    </div>
  );
}

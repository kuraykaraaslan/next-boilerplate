'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faBook, faExternalLink, faCog } from '@fortawesome/free-solid-svg-icons';

type SamlTenantRow = {
  tenantId: string;
  tenantName: string;
  isEnabled: boolean;
  idpEntityId: string;
  idpSsoUrl: string;
  updatedAt: string;
};

const PAGE_SIZE = 20;

const SAML_ENDPOINTS: { purpose: string; url: string; method: string }[] = [
  { purpose: 'SP Metadata',         url: '/tenant/{tenantId}/api/auth/saml/metadata', method: 'GET' },
  { purpose: 'SP-Initiated Login',  url: '/tenant/{tenantId}/api/auth/saml/initiate', method: 'GET' },
  { purpose: 'ACS (Callback)',      url: '/tenant/{tenantId}/api/auth/saml/callback', method: 'POST' },
  { purpose: 'Config API',          url: '/tenant/{tenantId}/api/saml/config',        method: 'GET / PUT / DELETE' },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

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
    { name: 'Okta',             url: 'https://developer.okta.com/docs/guides/saml-application-setup' },
    { name: 'Azure AD',         url: 'https://learn.microsoft.com/en-us/azure/active-directory/saas-apps/tutorial-list' },
    { name: 'Google Workspace', url: 'https://support.google.com/a/answer/6087519' },
    { name: 'OneLogin',         url: 'https://onelogin.com/saml' },
    { name: 'Auth0',            url: 'https://auth0.com/docs/authenticate/protocols/saml' },
    { name: 'JumpCloud',        url: 'https://support.jumpcloud.com/s/article/sso-saml' },
  ];

  const endpointColumns: TableColumn<typeof SAML_ENDPOINTS[number]>[] = [
    { key: 'purpose', header: 'Purpose', render: (e) => <span className="font-medium text-text-primary">{e.purpose}</span> },
    { key: 'url',     header: 'URL Pattern', render: (e) => <span className="font-mono text-xs text-text-secondary">{e.url}</span> },
    { key: 'method',  header: 'Method', render: (e) => <Badge variant="info">{e.method}</Badge> },
  ];

  return (
    <div className="space-y-6 pt-6">
      <Card title="Setup Guide" subtitle="How to configure SAML SSO for a tenant">
        <ol className="space-y-4 mt-2">
          {steps.map(({ step, title, desc }) => (
            <li key={step} className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-subtle text-primary text-sm font-bold flex items-center justify-center mt-0.5">
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
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 hover:border-primary hover:bg-surface-overlay transition-colors text-sm font-medium"
            >
              {name}
              <FontAwesomeIcon icon={faExternalLink} className="w-3 h-3 text-text-disabled" />
            </a>
          ))}
        </div>
      </Card>

      <ServerDataTable
        columns={endpointColumns}
        rows={SAML_ENDPOINTS}
        getRowKey={(e) => e.url}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        hidePagination
        title="SAML Endpoints"
        subtitle="URL patterns used by tenants"
      />
    </div>
  );
}

function OverviewTab() {
  const [rows, setRows]   = useState<SamlTenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setFetchError('');
    api
      .get('/system/api/saml/tenants', { params: { page, pageSize: PAGE_SIZE } })
      .then((res) => {
        setRows(res.data.rows ?? []);
        setTotal(res.data.total ?? 0);
      })
      .catch((err) => setFetchError(extractMessage(err, 'Failed to load tenants.')))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: TableColumn<SamlTenantRow>[] = [
    {
      key: 'tenantName',
      header: 'Tenant',
      render: (r) => <span className="font-medium text-text-primary">{r.tenantName}</span>,
    },
    {
      key: 'isEnabled',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.isEnabled ? 'success' : 'neutral'} dot>
          {r.isEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'idpEntityId',
      header: 'IdP Entity ID',
      render: (r) => (
        <span className="font-mono text-xs text-text-secondary block truncate max-w-xs">
          {r.idpEntityId || '—'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (r) => (
        <span className="text-xs text-text-secondary">
          {new Date(r.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'Configure',
                icon: <FontAwesomeIcon icon={faCog} />,
                onClick: () => {
                  window.location.href = `/tenant/${r.tenantId}/admin/settings/saml`;
                },
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="pt-6 space-y-4">
      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.tenantId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No tenants with SAML configured."
      />
    </div>
  );
}

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

'use client';
import { use } from 'react';
import { Card } from '@/modules/ui/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faLock, faUnlock } from '@fortawesome/free-solid-svg-icons';

type Endpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  auth: boolean;
};

const methodVariant: Record<Endpoint['method'], string> = {
  GET:    'bg-info-subtle text-info-fg',
  POST:   'bg-success-subtle text-success-fg',
  PUT:    'bg-warning-subtle text-warning-fg',
  PATCH:  'bg-warning-subtle text-warning-fg',
  DELETE: 'bg-error-subtle text-error-fg',
};

export default function TenantApiDocsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const base = `/tenant/${tenantId}`;

  const endpoints: { group: string; items: Endpoint[] }[] = [
    {
      group: 'Authentication',
      items: [
        { method: 'POST', path: `${base}/api/auth/login`,           summary: 'Login to tenant',              auth: false },
        { method: 'POST', path: `${base}/api/auth/register`,        summary: 'Register to tenant',           auth: false },
        { method: 'POST', path: `${base}/api/auth/logout`,          summary: 'Invalidate session',           auth: true },
        { method: 'POST', path: `${base}/api/auth/forgot-password`, summary: 'Request password reset',       auth: false },
      ],
    },
    {
      group: 'Members',
      items: [
        { method: 'GET',    path: `${base}/api/members`,     summary: 'List members',       auth: true },
        { method: 'PATCH',  path: `${base}/api/members/:id`, summary: 'Update member role', auth: true },
        { method: 'DELETE', path: `${base}/api/members/:id`, summary: 'Remove member',      auth: true },
      ],
    },
    {
      group: 'Invitations',
      items: [
        { method: 'POST',   path: `${base}/api/invitations`,     summary: 'Send invitation',   auth: true },
        { method: 'GET',    path: `${base}/api/invitations`,     summary: 'List invitations',  auth: true },
        { method: 'DELETE', path: `${base}/api/invitations/:id`, summary: 'Cancel invitation', auth: true },
      ],
    },
    {
      group: 'Settings',
      items: [
        { method: 'GET',   path: `${base}/api/settings`, summary: 'Get settings',    auth: true },
        { method: 'PATCH', path: `${base}/api/settings`, summary: 'Update settings', auth: true },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faBook} className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">API Reference</h1>
          <p className="text-sm text-text-secondary mt-0.5">Tenant API endpoints for <span className="font-mono">{tenantId}</span></p>
        </div>
      </div>

      <div className="space-y-6">
        {endpoints.map((section) => (
          <Card key={section.group} title={section.group}>
            <div className="space-y-2">
              {section.items.map((ep) => (
                <div
                  key={ep.path}
                  className="flex items-center gap-3 py-3 border-b border-border last:border-0 flex-wrap"
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono shrink-0 ${methodVariant[ep.method]}`}>
                    {ep.method}
                  </span>
                  <code className="text-xs font-mono text-text-primary flex-1 min-w-0 truncate">
                    {ep.path}
                  </code>
                  <span className="text-xs text-text-secondary hidden sm:block">{ep.summary}</span>
                  <span className="shrink-0" title={ep.auth ? 'Requires authentication' : 'Public'}>
                    <FontAwesomeIcon
                      icon={ep.auth ? faLock : faUnlock}
                      className={`w-3 h-3 ${ep.auth ? 'text-warning' : 'text-text-disabled'}`}
                    />
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

'use client';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
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

const endpoints: { group: string; items: Endpoint[] }[] = [
  {
    group: 'Authentication',
    items: [
      { method: 'POST', path: '/system/api/auth/login',           summary: 'Login with email & password', auth: false },
      { method: 'POST', path: '/system/api/auth/register',        summary: 'Register a new user',         auth: false },
      { method: 'POST', path: '/system/api/auth/logout',          summary: 'Invalidate session',          auth: true },
      { method: 'POST', path: '/system/api/auth/forgot-password', summary: 'Send password reset email',   auth: false },
    ],
  },
  {
    group: 'Users',
    items: [
      { method: 'GET',    path: '/system/api/users',           summary: 'List all users',     auth: true },
      { method: 'GET',    path: '/system/api/users/:id',       summary: 'Get user by ID',     auth: true },
      { method: 'PATCH',  path: '/system/api/users/:id',       summary: 'Update user',        auth: true },
      { method: 'DELETE', path: '/system/api/users/:id',       summary: 'Delete user',        auth: true },
    ],
  },
  {
    group: 'Tenants',
    items: [
      { method: 'GET',  path: '/system/api/tenants',          summary: 'List all tenants',   auth: true },
      { method: 'POST', path: '/system/api/tenants/create',   summary: 'Create a tenant',    auth: true },
      { method: 'GET',  path: '/system/api/tenants/:id',      summary: 'Get tenant details', auth: true },
    ],
  },
];

export default function SystemApiDocsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faBook} className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">System API Reference</h1>
          <p className="text-sm text-text-secondary mt-0.5">All available system-level API endpoints</p>
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

'use client';
import { useState } from 'react';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { Input } from '@/modules/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faBuilding } from '@fortawesome/free-solid-svg-icons';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
};

const mockTenants: Tenant[] = [
  { id: '1', name: 'Acme Corp',   slug: 'acme-corp',  memberCount: 12, status: 'ACTIVE',    createdAt: '2024-01-10' },
  { id: '2', name: 'Beta Labs',   slug: 'beta-labs',  memberCount: 4,  status: 'ACTIVE',    createdAt: '2024-02-20' },
  { id: '3', name: 'Gamma Inc',   slug: 'gamma-inc',  memberCount: 1,  status: 'SUSPENDED', createdAt: '2024-03-05' },
];

export default function TenantsPage() {
  const [search, setSearch] = useState('');

  const filtered = mockTenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Tenants</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage all tenant organizations</p>
        </div>
        <a href="/system/auth/create-tenant">
          <Button iconLeft={<FontAwesomeIcon icon={faPlus} />}>Create Tenant</Button>
        </a>
      </div>

      <Card>
        <div className="pb-4">
          <Input
            id="tenant-search"
            label="Search"
            placeholder="Search by name or slug…"
            prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto -mx-6 -mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Organization</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Members</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-surface-overlay transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary text-sm font-bold shrink-0">
                        {tenant.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-medium text-text-primary">{tenant.name}</p>
                        <p className="text-xs text-text-secondary">{tenant.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-primary">{tenant.memberCount}</td>
                  <td className="px-6 py-4">
                    <Badge variant={tenant.status === 'ACTIVE' ? 'success' : 'error'} dot>
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{tenant.createdAt}</td>
                  <td className="px-6 py-4 text-right">
                    <a href={`/system/admin/tenants/${tenant.id}`} className="text-xs text-primary hover:underline">
                      Manage
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-text-secondary">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

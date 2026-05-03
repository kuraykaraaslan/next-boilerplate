'use client';
import { useState } from 'react';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faUser } from '@fortawesome/free-solid-svg-icons';
import { Input } from '@/modules/ui/Input';

type User = {
  userId: string;
  email: string;
  name: string | null;
  userRole: 'ADMIN' | 'USER';
  userStatus: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  createdAt: string;
};

const mockUsers: User[] = [
  { userId: '1', email: 'admin@example.com', name: 'Admin User',  userRole: 'ADMIN', userStatus: 'ACTIVE',   createdAt: '2024-01-01' },
  { userId: '2', email: 'user@example.com',  name: 'John Doe',    userRole: 'USER',  userStatus: 'ACTIVE',   createdAt: '2024-02-15' },
  { userId: '3', email: 'banned@example.com', name: 'Bad Actor',  userRole: 'USER',  userStatus: 'BANNED',   createdAt: '2024-03-10' },
  { userId: '4', email: 'inactive@example.com', name: null,       userRole: 'USER',  userStatus: 'INACTIVE', createdAt: '2024-04-05' },
];

const statusVariant: Record<User['userStatus'], 'success' | 'error' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'neutral',
  BANNED:   'error',
};

const roleVariant: Record<User['userRole'], 'primary' | 'neutral'> = {
  ADMIN: 'primary',
  USER:  'neutral',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');

  const filtered = mockUsers.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Users</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage all system users</p>
        </div>
        <Button iconLeft={<FontAwesomeIcon icon={faPlus} />}>Invite User</Button>
      </div>

      <Card>
        <div className="pb-4">
          <Input
            id="user-search"
            label="Search"
            placeholder="Search by email or name…"
            prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto -mx-6 -mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user) => (
                <tr key={user.userId} className="hover:bg-surface-overlay transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary text-xs font-semibold shrink-0">
                        {user.name ? user.name.charAt(0).toUpperCase() : <FontAwesomeIcon icon={faUser} />}
                      </span>
                      <div>
                        <p className="font-medium text-text-primary">{user.name ?? '—'}</p>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={roleVariant[user.userRole]}>{user.userRole}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant[user.userStatus]} dot>{user.userStatus}</Badge>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{user.createdAt}</td>
                  <td className="px-6 py-4 text-right">
                    <a href={`/system/admin/users/${user.userId}`} className="text-xs text-primary hover:underline">
                      View
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-text-secondary">
                    No users found.
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

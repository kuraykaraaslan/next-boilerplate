'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import type { UserRole } from '@kuraykaraaslan/user/server/user.enums';

const roleMeta: Record<UserRole, { label: string; variant: 'error' | 'primary' | 'neutral' }> = {
  ADMIN: { label: 'Admin', variant: 'error' },
  USER:  { label: 'User',  variant: 'neutral' },
};

export function UserRoleBadge({ role, size = 'md' }: { role: UserRole; size?: 'sm' | 'md' | 'lg' }) {
  const meta = roleMeta[role] ?? { label: role, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size}>{meta.label}</Badge>;
}

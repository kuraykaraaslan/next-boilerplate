'use client';
import { Badge } from '@/modules/ui/Badge';
import type { UserStatus } from '@/modules/user/user.enums';

const statusMeta: Record<UserStatus, { label: string; variant: 'success' | 'neutral' | 'warning' | 'error' }> = {
  ACTIVE:    { label: 'Active',    variant: 'success' },
  INACTIVE:  { label: 'Inactive',  variant: 'neutral' },
  SUSPENDED: { label: 'Suspended', variant: 'warning' },
};

export function UserStatusBadge({
  status,
  size = 'md',
  dot = false,
}: {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}) {
  const meta = statusMeta[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size} dot={dot}>{meta.label}</Badge>;
}

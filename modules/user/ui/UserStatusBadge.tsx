'use client';
import { Badge } from '@nb/common/ui/Badge';
import type { UserStatus } from '@nb/user/server/user.enums';

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

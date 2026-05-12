'use client';
import { cn } from '@/libs/utils/cn';
import { Avatar } from '@/modules_next/common/ui/Avatar';
import { UserRoleBadge } from './user.role-badge';
import { UserStatusBadge } from './user.status-badge';
import type { SafeUser } from '@/modules/user/user.types';

export function UserProfileCard({
  user,
  actions,
  className,
}: {
  user: SafeUser;
  actions?: React.ReactNode;
  className?: string;
}) {
  const name = user.userProfile?.name ?? user.email;

  return (
    <div className={cn('bg-surface-raised border border-border rounded-xl overflow-hidden', className)}>
      <div className="h-20 bg-gradient-to-r from-primary-subtle to-secondary/20" />
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between -mt-8 mb-3">
          <div className="ring-4 ring-surface-raised rounded-full">
            <Avatar
              src={user.userProfile?.profilePicture ?? null}
              name={name}
              size="xl"
            />
          </div>
          {actions && <div className="flex items-center gap-2 pb-1">{actions}</div>}
        </div>

        <div className="space-y-1 mb-3">
          <h3 className="text-lg font-bold text-text-primary leading-tight">{name}</h3>
          {user.userProfile?.biography && (
            <p className="text-sm text-text-secondary leading-relaxed pt-1">{user.userProfile.biography}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <UserRoleBadge role={user.userRole} />
          <UserStatusBadge status={user.userStatus} />
          <span className="text-xs text-text-secondary truncate">{user.email}</span>
        </div>
      </div>
    </div>
  );
}

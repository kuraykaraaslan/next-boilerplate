'use client';
import { cn } from '@nb/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faArrowRight, faPeopleGroup } from '@fortawesome/free-solid-svg-icons';

export interface TenantSummary {
  tenantId: string;
  name: string;
  memberCount?: number;
}

export function TenantSelectorCard({
  tenant,
  onClick,
  className,
}: {
  tenant: TenantSummary;
  onClick: (tenantId: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(tenant.tenantId)}
      className={cn(
        'group w-full text-left rounded-xl border border-border bg-surface-raised p-4',
        'hover:border-primary hover:bg-primary-subtle transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-overlay text-text-secondary group-hover:bg-primary group-hover:text-primary-fg transition-colors shrink-0">
          <FontAwesomeIcon icon={faBuilding} className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary truncate">{tenant.name}</p>
          {tenant.memberCount !== undefined && (
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <FontAwesomeIcon icon={faPeopleGroup} className="w-3 h-3" aria-hidden="true" />
              {tenant.memberCount} {tenant.memberCount === 1 ? 'member' : 'members'}
            </p>
          )}
        </div>
        <FontAwesomeIcon
          icon={faArrowRight}
          className="w-3.5 h-3.5 text-text-disabled group-hover:text-primary transition-colors shrink-0"
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

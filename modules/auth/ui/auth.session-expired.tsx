'use client';
import { cn } from '@/libs/utils/cn';
import { Button } from '@/modules/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';

type SessionExpiredBannerProps = {
  onSignIn?: () => void;
  message?: string;
  className?: string;
};

export function SessionExpiredBanner({
  onSignIn,
  message = 'Your session has expired. Please sign in again to continue.',
  className,
}: SessionExpiredBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start sm:items-center justify-between gap-4 flex-wrap',
        'rounded-lg border border-warning bg-warning-subtle px-4 py-3',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <FontAwesomeIcon icon={faClock} className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">Session expired</p>
          <p className="text-sm text-text-secondary mt-0.5">{message}</p>
        </div>
      </div>
      {onSignIn && (
        <Button variant="primary" size="sm" onClick={onSignIn} className="shrink-0">
          Sign in again
        </Button>
      )}
    </div>
  );
}

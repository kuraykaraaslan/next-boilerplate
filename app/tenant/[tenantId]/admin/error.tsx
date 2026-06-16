'use client';
import { useEffect } from 'react';
import { Button } from '@nb/common/ui/button.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

export default function TenantAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-error text-5xl" aria-hidden="true"><FontAwesomeIcon icon={faTriangleExclamation} /></div>
      <h2 className="text-xl font-semibold text-text-primary">Something went wrong</h2>
      <p className="text-text-secondary text-sm max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && (
        <p className="text-text-disabled text-xs font-mono">Error ID: {error.digest}</p>
      )}
      <Button variant="primary" onClick={reset}>Try again</Button>
    </div>
  );
}

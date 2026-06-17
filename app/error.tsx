'use client';
import { useEffect } from 'react';
import { ErrorScreen } from '@kuraykaraaslan/common/ui/error-screen.component';

// Root error boundary — catches errors anywhere under the root layout that aren't
// caught by a nearer boundary. Same shared ErrorScreen as everywhere else.
export default function RootError({
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
    <ErrorScreen
      message={error.message || 'An unexpected error occurred. You can try again or head back home.'}
      onRetry={reset}
    />
  );
}

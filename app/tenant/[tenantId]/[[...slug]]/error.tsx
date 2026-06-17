'use client';
import { useEffect } from 'react';
import { ErrorScreen } from '@kuraykaraaslan/common/ui/error-screen.component';

// Segment-level error boundary for the universal tenant catch-all. Uses the shared
// ErrorScreen so every failure across the app looks identical. `error.digest` is a
// server hash — we log it, never surface it to the user.
export default function TenantError({
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
      message={error.message || 'An unexpected error occurred while loading this page. You can try again or head back home.'}
      onRetry={reset}
    />
  );
}

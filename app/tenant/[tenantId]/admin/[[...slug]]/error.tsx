'use client';
import { useEffect } from 'react';
import { ErrorScreen } from '@kuraykaraaslan/common/ui/error-screen.component';

// Content-area error boundary for admin pages. Sits inside the persisted shell
// (layout.tsx) so a page failure shows the shared ErrorScreen in the content area
// without tearing down the sidebar/topbar. `error.digest` is a server hash — we
// log it, never surface it to the user.
export default function AdminError({
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

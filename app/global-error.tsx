'use client';
import { useEffect } from 'react';
import { ErrorScreen } from '@kuraykaraaslan/common/ui/error-screen.component';
import './globals.css';

// Last-resort boundary: catches errors in the ROOT layout itself, so it must
// render its own <html>/<body> (it replaces the root layout). Same ErrorScreen.
export default function GlobalError({
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface-base text-text-primary antialiased font-sans">
        <ErrorScreen
          message={error.message || 'An unexpected error occurred. You can try again or head back home.'}
          onRetry={reset}
        />
      </body>
    </html>
  );
}

'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateRight, faHouse, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

// Segment-level error boundary for the universal tenant catch-all. Kept visually
// in step with the root welcome hero: ambient gradient orbs + a glass card, an
// animated glyph, and two always-present recovery actions (retry / go home).
// `error.digest` is a server hash — we log it, never surface it to the user.
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
    <main className="relative isolate flex min-h-[80vh] items-center justify-center overflow-hidden bg-surface-base px-6 py-24">
      {/* ambient gradient orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-error/20 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div
        role="alert"
        className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-border bg-surface-raised/80 p-10 text-center shadow-xl backdrop-blur"
      >
        <span className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-error/20 motion-reduce:animate-none" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-error-subtle text-error">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-3xl" aria-hidden="true" />
          </span>
        </span>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">Something went wrong</h2>
          <p className="mx-auto max-w-sm text-sm text-text-secondary">
            {error.message || 'An unexpected error occurred while loading this page. You can try again or head back home.'}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="group inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} aria-hidden="true" className="transition-transform group-hover:rotate-90 motion-reduce:transform-none" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
          >
            <FontAwesomeIcon icon={faHouse} aria-hidden="true" />
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

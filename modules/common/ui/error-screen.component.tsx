'use client';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowRotateRight, faHouse, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

/**
 * The single, app-wide error/empty-state screen: ambient gradient orbs + a glass
 * card with an animated glyph and recovery actions. Used by every error boundary
 * (root error, global-error, the tenant catch-all) and the 404 page so every
 * failure looks identical. Icons are FontAwesome (SVG), matching the rest of the app.
 */
export function ErrorScreen({
  title = 'Something went wrong',
  message,
  icon = faTriangleExclamation,
  onRetry,
  retryLabel = 'Try again',
  homeHref = '/',
  homeLabel = 'Go home',
}: {
  title?: string;
  message?: string;
  icon?: IconDefinition;
  /** When provided, renders a "Try again" button (error boundaries pass `reset`). */
  onRetry?: () => void;
  retryLabel?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-surface-base px-6 py-24">
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
            <FontAwesomeIcon icon={icon} className="text-3xl" aria-hidden="true" />
          </span>
        </span>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h2>
          {message && <p className="mx-auto max-w-sm text-sm text-text-secondary">{message}</p>}
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
            >
              <FontAwesomeIcon icon={faArrowRotateRight} aria-hidden="true" className="transition-transform group-hover:rotate-90 motion-reduce:transform-none" />
              {retryLabel}
            </button>
          )}
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
          >
            <FontAwesomeIcon icon={faHouse} aria-hidden="true" />
            {homeLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}

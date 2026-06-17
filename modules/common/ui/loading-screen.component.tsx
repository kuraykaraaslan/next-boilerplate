import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';

/**
 * The single, app-wide full-page loading screen — visually in step with
 * ErrorScreen (ambient gradient orbs + glass card), with a spinning FontAwesome
 * glyph. Used by route-level loading boundaries so loading + error look unified.
 */
export function LoadingScreen({
  title = 'Loading…',
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-surface-base px-6 py-24">
      {/* ambient gradient orbs (same as ErrorScreen, primary-tinted) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-border bg-surface-raised/80 p-10 text-center shadow-xl backdrop-blur"
      >
        <span className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 motion-reduce:animate-none" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-surface-overlay text-primary">
            <FontAwesomeIcon icon={faCircleNotch} spin className="text-3xl" aria-hidden="true" />
          </span>
        </span>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h2>
          {message && <p className="mx-auto max-w-sm text-sm text-text-secondary">{message}</p>}
        </div>
      </div>
    </main>
  );
}

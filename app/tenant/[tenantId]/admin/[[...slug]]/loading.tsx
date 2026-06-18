import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';

// Scoped to the admin content area: because the shell now lives in layout.tsx,
// this fallback renders *inside* the persisted sidebar/topbar instead of taking
// over the full screen — so navigating between admin pages no longer blanks the
// shell.
export default function AdminContentLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <Spinner size="xl" />
      <p className="text-text-secondary text-sm">Loading…</p>
    </div>
  );
}

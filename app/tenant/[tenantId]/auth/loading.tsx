import { Spinner } from '@/modules_next/common/ui/Spinner';

export default function TenantAuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Spinner size="xl" />
      <h2 className="text-xl font-semibold text-text-primary">Loading…</h2>
      <p className="text-text-secondary text-sm max-w-sm">
        Please wait while we get things ready.
      </p>
    </div>
  );
}

import { Spinner } from '@nb/common/ui/Spinner';

export default function TenantAdminLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <Spinner size="xl" />
      <h2 className="text-xl font-semibold text-text-primary">Loading…</h2>
      <p className="text-text-secondary text-sm max-w-md">
        Please wait while we prepare your dashboard.
      </p>
    </div>
  );
}

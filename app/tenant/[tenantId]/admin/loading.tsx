import { SkeletonCard, SkeletonTable } from '@/modules/ui/Skeleton';

export default function TenantAdminLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 animate-pulse motion-reduce:animate-none rounded bg-surface-overlay" aria-hidden="true" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}

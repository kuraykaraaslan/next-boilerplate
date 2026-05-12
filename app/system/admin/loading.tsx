import { SkeletonCard, SkeletonTable } from '@/modules_next/common/ui/Skeleton';

export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 animate-pulse motion-reduce:animate-none rounded bg-surface-overlay" aria-hidden="true" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}

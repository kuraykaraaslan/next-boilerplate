export default function BlockSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse bg-[var(--surface-raised)]"
      style={{ minHeight: height }}
      aria-hidden="true"
    />
  )
}

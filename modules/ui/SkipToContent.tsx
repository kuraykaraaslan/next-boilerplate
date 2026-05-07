'use client';

export function SkipToContent({ targetId = 'main-content' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-fg focus:font-medium focus:shadow-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}

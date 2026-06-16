import type { ReactNode } from 'react';

/** Centered public auth shell (was app/.../auth/layout.tsx). */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}

'use client';
import { useEffect } from 'react';
import { Button } from '@/modules/ui/Button';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold text-text-primary">Authentication error</h2>
      <p className="text-text-secondary text-sm max-w-sm">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={reset}>Try again</Button>
        <Button variant="ghost" onClick={() => window.location.href = '/'}>Go home</Button>
      </div>
    </div>
  );
}

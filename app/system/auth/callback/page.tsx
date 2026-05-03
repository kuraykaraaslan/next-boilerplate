'use client';
import { useEffect, useState } from 'react';
import api from '@/libs/axios';
import { Spinner } from '@/modules/ui/Spinner';

export default function SystemCallbackPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const provider = params.get('provider');

    if (!code || !provider) {
      setError('Invalid callback parameters. Please try signing in again.');
      return;
    }

    api.get(`/system/api/auth/sso/${provider.toLowerCase()}/callback`, { params: { code } })
      .then(() => { window.location.href = '/system/auth/select-tenant'; })
      .catch(() => { setError('Authentication failed. Please try again.'); });
  }, []);

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 text-center space-y-4">
        {error ? (
          <>
            <p className="text-sm font-semibold text-error">{error}</p>
            <a href="/system/auth/login" className="text-sm text-primary hover:underline">
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <div className="flex justify-center"><Spinner size="lg" /></div>
            <p className="text-sm text-text-secondary">Completing sign in…</p>
          </>
        )}
      </div>
    </div>
  );
}

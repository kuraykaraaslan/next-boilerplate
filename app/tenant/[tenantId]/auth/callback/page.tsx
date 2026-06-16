'use client';
import { use, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { Spinner } from '@nb/common/ui/Spinner';

export default function TenantCallbackPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [error, setError] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const provider = searchParams.get('provider');

    if (!code || !provider) {
      setError('Invalid callback parameters. Please try signing in again.');
      return;
    }

    api.get(`/tenant/${tenantId}/api/auth/sso/${provider.toLowerCase()}/callback`, { params: { code } })
      .then(() => { window.location.href = `/tenant/${tenantId}/admin/members`; })
      .catch(() => setError('Authentication failed. Please try again.'));
  }, [tenantId]);

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 text-center space-y-4">
        {error ? (
          <>
            <p className="text-sm font-semibold text-error">{error}</p>
            <a href={`/tenant/${tenantId}/auth/login`} className="text-sm text-primary hover:underline">
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <Spinner size="lg" />
            </div>
            <p className="text-sm text-text-secondary">Completing sign in…</p>
          </>
        )}
      </div>
    </div>
  );
}

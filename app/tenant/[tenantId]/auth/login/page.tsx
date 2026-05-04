'use client';
import { use, useState } from 'react';
import api from '@/libs/axios';
import { BrandLogo } from '@/modules/ui/BrandLogo';
import { LoginForm } from '@/modules/auth/ui/auth.login';
import { OAuthButtons } from '@/modules/auth/ui/auth.oauth-buttons';

export default function TenantLoginPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [successMsg, setSuccessMsg] = useState('');

  async function handleLogin(values: { email: string; password: string; rememberMe: boolean }) {
    try {
      await api.post(`/tenant/${tenantId}/api/auth/login`, { email: values.email, password: values.password });
      setSuccessMsg(`Signed in as ${values.email}`);
    } catch (err: any) {
      throw new Error(err.response?.data?.error ?? err.message ?? 'Login failed.');
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo>{tenantId.charAt(0).toUpperCase()}</BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary">Sign in to <span className="font-medium">{tenantId}</span></p>
        </div>

        {successMsg ? (
          <div className="rounded-lg bg-success-subtle border border-success px-4 py-3 text-center">
            <p className="text-sm font-semibold text-success-fg">Signed in successfully!</p>
            <p className="text-sm text-success-fg mt-0.5">{successMsg}</p>
          </div>
        ) : (
          <>
            <OAuthButtons providers={['GOOGLE', 'GITHUB']} onProvider={async () => {}} />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" aria-hidden="true" />
              <span className="text-xs text-text-secondary">or continue with email</span>
              <div className="flex-1 h-px bg-border" aria-hidden="true" />
            </div>

            <LoginForm onSubmit={handleLogin} />

            <p className="text-center text-xs text-text-secondary">
              <a href={`/tenant/${tenantId}/auth/forgot-password`} className="text-primary hover:underline">
                Forgot your password?
              </a>
            </p>
          </>
        )}
      </div>

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <a href={`/tenant/${tenantId}/auth/register`} className="text-primary font-medium hover:underline">
          Sign up
        </a>
      </p>
    </div>
  );
}

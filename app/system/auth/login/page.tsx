'use client';
import { useState } from 'react';
import api from '@/libs/axios';
import { BrandLogo } from '@/modules_next/common/ui/BrandLogo';
import { LoginForm } from '@/modules_next/auth/ui/auth.login';
import { OAuthButtons } from '@/modules_next/auth/ui/auth.oauth-buttons';

export default function SystemLoginPage() {
  const [successMsg, setSuccessMsg] = useState('');

  async function handleLogin(values: { email: string; password: string; rememberMe: boolean }) {
    try {
      await api.post('/system/api/auth/login', { email: values.email, password: values.password });
      setSuccessMsg(`Signed in as ${values.email}`);
      window.location.href = '/system/auth/select-tenant';
    } catch (err: any) {
      throw new Error(err.response?.data?.error ?? err.message ?? 'Login failed.');
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo>S</BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">System Sign In</h1>
          <p className="text-sm text-text-secondary">Sign in to the system administration panel</p>
        </div>

        {successMsg ? (
          <div className="rounded-lg bg-success-subtle border border-success px-4 py-3 text-center space-y-1">
            <p className="text-sm font-semibold text-success-fg">Success!</p>
            <p className="text-sm text-success-fg">{successMsg}</p>
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
              <a href="/system/auth/forgot-password" className="text-primary hover:underline">
                Forgot your password?
              </a>
            </p>
          </>
        )}
      </div>

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <a href="/system/auth/register" className="text-primary font-medium hover:underline">
          Sign up
        </a>
      </p>
    </div>
  );
}

'use client';
import { useState } from 'react';
import api from '@/libs/axios';
import { BrandLogo } from '@/modules_next/common/ui/BrandLogo';
import { RegisterForm } from '@/modules_next/auth/ui/auth.register';
import { OAuthButtons } from '@/modules_next/auth/ui/auth.oauth-buttons';

export default function SystemRegisterPage() {
  const [successMsg, setSuccessMsg] = useState('');

  async function handleRegister(values: { email: string; password: string }) {
    try {
      await api.post('/system/api/auth/register', values);
      setSuccessMsg(`Account created for ${values.email}`);
    } catch (err: any) {
      throw new Error(err.response?.data?.error ?? err.message ?? 'Registration failed.');
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo>S</BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create Account</h1>
          <p className="text-sm text-text-secondary">Register for system access</p>
        </div>

        {successMsg ? (
          <div className="rounded-lg bg-success-subtle border border-success px-4 py-3 text-center space-y-1">
            <p className="text-sm font-semibold text-success-fg">Account created!</p>
            <p className="text-sm text-success-fg">{successMsg}</p>
          </div>
        ) : (
          <>
            <OAuthButtons providers={['GOOGLE', 'GITHUB']} onProvider={async () => {}} />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" aria-hidden="true" />
              <span className="text-xs text-text-secondary">or register with email</span>
              <div className="flex-1 h-px bg-border" aria-hidden="true" />
            </div>

            <RegisterForm onSubmit={handleRegister} />
          </>
        )}
      </div>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <a href="/system/auth/login" className="text-primary font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}

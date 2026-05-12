'use client';
import { use } from 'react';
import api from '@/libs/axios';
import { BrandLogo } from '@/modules_next/common/ui/BrandLogo';
import { ForgotPasswordForm } from '@/modules_next/auth/ui/auth.forgot-password';

export default function TenantForgotPasswordPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  async function handleSubmit(email: string) {
    try {
      await api.post(`/tenant/${tenantId}/api/auth/forgot-password`, { email });
    } catch (err: any) {
      throw new Error(err.response?.data?.error ?? err.message ?? 'Failed to send reset link.');
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo>{tenantId.charAt(0).toUpperCase()}</BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Forgot Password</h1>
          <p className="text-sm text-text-secondary">
            We&apos;ll send a reset link to your email.
          </p>
        </div>

        <ForgotPasswordForm onSubmit={handleSubmit} />
      </div>

      <p className="text-center text-sm text-text-secondary">
        Remember your password?{' '}
        <a href={`/tenant/${tenantId}/auth/login`} className="text-primary font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}

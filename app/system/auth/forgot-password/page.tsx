'use client';
import api from '@/libs/axios';
import { BrandLogo } from '@/modules_next/common/ui/BrandLogo';
import { ForgotPasswordForm } from '@/modules_next/auth/ui/ForgotPasswordForm';

export default function SystemForgotPasswordPage() {
  async function handleSubmit(email: string) {
    try {
      await api.post('/system/api/auth/forgot-password', { email });
    } catch (err: any) {
      throw new Error(err.response?.data?.error ?? err.message ?? 'Failed to send reset link.');
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo>S</BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Forgot Password</h1>
          <p className="text-sm text-text-secondary">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <ForgotPasswordForm onSubmit={handleSubmit} />
      </div>

      <p className="text-center text-sm text-text-secondary">
        Remember your password?{' '}
        <a href="/system/auth/login" className="text-primary font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}

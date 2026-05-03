'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Form } from '@/modules/app/Form';
import { Input } from '@/modules/ui/Input';
import { Button } from '@/modules/ui/Button';

type ForgotPasswordFormProps = {
  onSubmit: (email: string) => Promise<void> | void;
  error?: string;
  className?: string;
};

export function ForgotPasswordForm({ onSubmit, error, className }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState('');

  function validate(): boolean {
    if (!email) { setEmailError('Email is required.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Enter a valid email address.'); return false; }
    setEmailError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try { await onSubmit(email); setSent(true); } catch (err: any) { setApiError(err.message ?? 'Failed to send reset link.'); } finally { setLoading(false); }
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-success-subtle border border-success px-4 py-4 text-sm text-success-fg space-y-1">
        <p className="font-semibold">Check your inbox</p>
        <p>We sent a password reset link to <span className="font-mono">{email}</span>.</p>
      </div>
    );
  }

  return (
    <Form onSubmit={handleSubmit} error={error || apiError} className={className}>
      <Input
        id="forgot-email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={emailError}
      />
      <Button type="submit" fullWidth loading={loading}>
        Send reset link
      </Button>
    </Form>
  );
}

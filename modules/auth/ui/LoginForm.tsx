'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { Form } from '@nb/common/ui/Form';
import { Input } from '@nb/common/ui/Input';
import { Button } from '@nb/common/ui/Button';

type LoginFormValues = { email: string; password: string; rememberMe: boolean };
type LoginFormErrors = Partial<Record<'email' | 'password', string>>;

type LoginFormProps = {
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  error?: string;
  className?: string;
};

export function LoginForm({ onSubmit, error, className }: LoginFormProps) {
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  function validate(): boolean {
    const next: LoginFormErrors = {};
    if (!values.email) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'Enter a valid email address.';
    if (!values.password) next.password = 'Password is required.';
    else if (values.password.length < 8) next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try { await onSubmit(values); } catch (err: any) { setApiError(err.message ?? 'Sign in failed.'); } finally { setLoading(false); }
  }

  return (
    <Form onSubmit={handleSubmit} error={error || apiError} className={className}>
      <Input
        id="login-email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        prefixIcon={<FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />}
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email}
      />

      <Input
        id="login-password"
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        prefixIcon={<FontAwesomeIcon icon={faLock} className="w-3.5 h-3.5" />}
        value={values.password}
        onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
        error={errors.password}
      />

      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
        <input
          type="checkbox"
          checked={values.rememberMe}
          onChange={(e) => setValues((v) => ({ ...v, rememberMe: e.target.checked }))}
          className="rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        />
        Remember me
      </label>

      <Button type="submit" fullWidth loading={loading}>
        Sign In
      </Button>
    </Form>
  );
}

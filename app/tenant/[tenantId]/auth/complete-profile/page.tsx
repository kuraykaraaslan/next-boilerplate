'use client';
import { use, useState } from 'react';
import api from '@nb/common/server/axios';
import { Spinner } from '@nb/common/ui/spinner.component';

/**
 * Shown right after a no-email login (national identity / e-Devlet, or any
 * provider that returns no email). The account currently holds a synthetic
 * placeholder email; the user either adds a real email (verified) or merges
 * this identity into an account they already own.
 */
export default function CompleteProfilePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [mode, setMode] = useState<'choose' | 'email' | 'merge'>('choose');
  const [email, setEmail] = useState('');
  const [mergeEmail, setMergeEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post(`/tenant/${tenantId}/api/auth/me/complete-email`, { email });
      setDone('Verification email sent. Check your inbox to confirm your address.');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not save email.');
    } finally { setBusy(false); }
  }

  async function submitMerge(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/auth/me/merge-identity`, { email: mergeEmail, password });
      window.location.href = res.data?.redirect ?? `/tenant/${tenantId}/admin`;
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not merge accounts.');
    } finally { setBusy(false); }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">Finish setting up</h1>
          <p className="text-sm text-text-secondary">Your identity was verified, but we still need an email for your account.</p>
        </div>

        {error && <p className="text-sm font-semibold text-error text-center">{error}</p>}
        {done && <p className="text-sm font-semibold text-success-fg text-center">{done}</p>}

        {mode === 'choose' && !done && (
          <div className="space-y-3">
            <button type="button" onClick={() => setMode('email')}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
              Add a new email address
            </button>
            <button type="button" onClick={() => setMode('merge')}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-raised">
              I already have an account
            </button>
          </div>
        )}

        {mode === 'email' && !done && (
          <form onSubmit={submitEmail} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm" />
            <button type="submit" disabled={busy}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {busy ? <Spinner size="sm" /> : 'Send verification email'}
            </button>
            <button type="button" onClick={() => setMode('choose')} className="w-full text-xs text-text-secondary hover:underline">Back</button>
          </form>
        )}

        {mode === 'merge' && !done && (
          <form onSubmit={submitMerge} className="space-y-3">
            <input type="email" required value={mergeEmail} onChange={(e) => setMergeEmail(e.target.value)}
              placeholder="Existing account email"
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm" />
            <button type="submit" disabled={busy}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {busy ? <Spinner size="sm" /> : 'Link & sign in to my account'}
            </button>
            <button type="button" onClick={() => setMode('choose')} className="w-full text-xs text-text-secondary hover:underline">Back</button>
          </form>
        )}
      </div>
    </div>
  );
}

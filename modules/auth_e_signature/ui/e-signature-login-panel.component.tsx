'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faMobileScreen, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import api from '@kuraykaraaslan/common/server/axios';
import { Form } from '@kuraykaraaslan/common/ui/form.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';

type ProviderHint = {
  id: string;
  name: string;
  identifierLabel: string;
  identifierPlaceholder?: string;
  capabilities: string[];
  loa: 'low' | 'substantial' | 'high';
};

type CountryHint = {
  country: string;
  providers: ProviderHint[];
};

type Phase = 'idle' | 'submitting' | 'awaiting_sign' | 'success' | 'needs_binding' | 'error';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_MS = 180_000;

type ESignatureLoginPanelProps = {
  onSuccess: () => void;
  onNeedsBinding?: (identityFingerprint: string) => void;
  className?: string;
  /**
   * API scope prefix for the e-signature endpoints. Defaults to '/system'
   * (platform login). Tenant login pages should pass `/tenant/${tenantId}`
   * so the session is created in the correct tenant scope.
   */
  apiBase?: string;
};

export function ESignatureLoginPanel({ onSuccess, onNeedsBinding, className, apiBase = '/system' }: ESignatureLoginPanelProps) {
  const [countries, setCountries] = useState<CountryHint[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [identifier, setIdentifier] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const txnRef = useRef<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;
    api.get(`${apiBase}/api/auth/e-signature/countries`)
      .then((res) => {
        if (!active) return;
        const list = (res.data?.data ?? []) as CountryHint[];
        setCountries(list);
        if (list.length && !selectedCountry) {
          setSelectedCountry(list[0].country);
          setSelectedProviderId(list[0].providers[0]?.id ?? '');
        }
      })
      .catch(() => setCountries([]));
    return () => { active = false; };
  }, [selectedCountry, apiBase]);

  useEffect(() => () => stopPolling(), []);

  const providersForCountry = useMemo<ProviderHint[]>(() => {
    return countries.find((c) => c.country === selectedCountry)?.providers ?? [];
  }, [countries, selectedCountry]);

  const selectedProvider = useMemo<ProviderHint | undefined>(() => {
    return providersForCountry.find((p) => p.id === selectedProviderId) ?? providersForCountry[0];
  }, [providersForCountry, selectedProviderId]);

  function stopPolling() {
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null; }
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    txnRef.current = null;
  }

  function startTicker(expiresIn: number) {
    setSecondsLeft(expiresIn);
    startedAtRef.current = Date.now();
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSecondsLeft(Math.max(0, expiresIn - elapsed));
    }, 1000);
  }

  async function poll() {
    const id = txnRef.current;
    if (!id) return;
    if (Date.now() - startedAtRef.current > MAX_POLL_MS) {
      setError('Sign-in attempt timed out.');
      setPhase('error');
      stopPolling();
      return;
    }
    try {
      const res = await api.get(`${apiBase}/api/auth/e-signature/status/${id}`);
      const data = res.data?.data;
      if (data?.status === 'signed') {
        setPhase('success');
        stopPolling();
        onSuccess();
        return;
      }
      // still pending — schedule next poll
      pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { code?: string; message?: string }; data?: { identity?: { evidence?: { fingerprint_sha256?: string } } } } }; message?: string };
      const code = ax.response?.data?.error?.code;
      if (code === 'NEEDS_BINDING') {
        stopPolling();
        setPhase('needs_binding');
        const fp = ax.response?.data?.data?.identity?.evidence?.fingerprint_sha256 ?? '';
        onNeedsBinding?.(fp);
        return;
      }
      const message = ax.response?.data?.error?.message ?? ax.message ?? 'Sign-in failed.';
      setError(message);
      setPhase('error');
      stopPolling();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selectedCountry || !selectedProvider) {
      setError('Please choose a country and identity provider.');
      return;
    }
    if (!identifier.trim()) {
      setError(`${selectedProvider.identifierLabel} is required.`);
      return;
    }
    setPhase('submitting');
    try {
      const res = await api.post(`${apiBase}/api/auth/e-signature/initiate`, {
        country: selectedCountry,
        identifier: identifier.trim(),
        providerOverride: selectedProvider.id,
      });
      const data = res.data?.data;
      if (!data?.transactionId) throw new Error('Invalid server response.');
      txnRef.current = data.transactionId;
      setDisplayCode(data.displayCode ?? null);
      setPhase('awaiting_sign');
      startTicker(data.expiresIn ?? 120);
      pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const message = ax.response?.data?.error?.message ?? ax.message ?? 'Failed to start e-signature flow.';
      setError(message);
      setPhase('error');
    }
  }

  function handleCancel() {
    stopPolling();
    setPhase('idle');
    setError('');
    setDisplayCode(null);
  }

  if (countries.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" aria-hidden="true" />
        <span className="text-xs text-text-secondary">or with e-signature</span>
        <div className="flex-1 h-px bg-border" aria-hidden="true" />
      </div>

      {phase === 'idle' || phase === 'submitting' || phase === 'error' ? (
        <Form onSubmit={handleSubmit} error={error}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  const first = countries.find((c) => c.country === e.target.value)?.providers[0];
                  setSelectedProviderId(first?.id ?? '');
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {countries.map((c) => (
                  <option key={c.country} value={c.country}>{c.country}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Method</label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {providersForCountry.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            id="esignature-identifier"
            label={selectedProvider?.identifierLabel ?? 'Identifier'}
            placeholder={selectedProvider?.identifierPlaceholder}
            required
            prefixIcon={<FontAwesomeIcon icon={faMobileScreen} className="w-3.5 h-3.5" />}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />

          <Button type="submit" fullWidth loading={phase === 'submitting'}>
            <FontAwesomeIcon icon={faIdCard} className="w-3.5 h-3.5 mr-2" />
            Continue with e-signature
          </Button>
        </Form>
      ) : null}

      {phase === 'awaiting_sign' ? (
        <div className="rounded-lg border border-border bg-surface-raised p-4 space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-text-primary">
            <Spinner size="sm" />
            <span>Check your phone and confirm the signature request.</span>
          </div>
          {displayCode ? (
            <div className="rounded-md bg-surface p-3">
              <p className="text-[11px] uppercase tracking-wide text-text-secondary">Verification code</p>
              <p className="font-mono text-2xl font-bold tracking-widest">{displayCode}</p>
              <p className="text-[11px] text-text-secondary mt-1">Make sure this code matches the one shown on your device.</p>
            </div>
          ) : null}
          <p className="text-xs text-text-secondary">
            <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 mr-1" />
            Expires in {secondsLeft}s
          </p>
          <Button type="button" variant="ghost" fullWidth onClick={handleCancel}>Cancel</Button>
        </div>
      ) : null}

      {phase === 'needs_binding' ? (
        <div className="rounded-lg border border-warning bg-warning-subtle p-4 text-sm space-y-2">
          <p className="font-semibold text-warning-fg">No account linked to this certificate.</p>
          <p className="text-warning-fg">Sign in with your email and password first, then link this signing identity from your security settings.</p>
          <Button type="button" variant="ghost" fullWidth onClick={handleCancel}>Try a different identifier</Button>
        </div>
      ) : null}
    </div>
  );
}

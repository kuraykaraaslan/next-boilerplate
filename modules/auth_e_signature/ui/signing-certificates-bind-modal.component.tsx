'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faMobileScreen } from '@fortawesome/free-solid-svg-icons';

type ProviderHint = {
  id: string; name: string; identifierLabel: string; identifierPlaceholder?: string; loa: 'low' | 'substantial' | 'high';
};
type CountryHint = { country: string; providers: ProviderHint[] };
type Stage = 'idle' | 'requesting_otp' | 'awaiting_otp' | 'initiating' | 'awaiting_sign' | 'success' | 'error';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_MS = 180_000;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SigningCertificatesBindModal({ open, onClose, onSuccess }: Props) {
  const [countries, setCountries]   = useState<CountryHint[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [otpToken, setOtpToken]     = useState('');
  const [stage, setStage]           = useState<Stage>('idle');
  const [bindError, setBindError]   = useState('');
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const txnRef      = useRef<string | null>(null);
  const pollRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    api.get('/system/api/auth/e-signature/countries')
      .then((res) => {
        const list = (res.data?.data ?? []) as CountryHint[];
        setCountries(list);
        if (list.length && !selectedCountry) {
          setSelectedCountry(list[0].country);
          setSelectedProviderId(list[0].providers[0]?.id ?? '');
        }
      })
      .catch(() => setCountries([]));
  }, [open, selectedCountry]);

  useEffect(() => () => stopPolling(), []);

  const providers = useMemo<ProviderHint[]>(
    () => countries.find((c) => c.country === selectedCountry)?.providers ?? [],
    [countries, selectedCountry],
  );
  const selectedProvider = useMemo<ProviderHint | undefined>(
    () => providers.find((p) => p.id === selectedProviderId) ?? providers[0],
    [providers, selectedProviderId],
  );

  function stopPolling() {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
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

  function reset() {
    stopPolling();
    setStage('idle'); setIdentifier(''); setOtpToken('');
    setDisplayCode(null); setBindError('');
    onClose();
  }

  async function requestOtp() {
    setBindError(''); setStage('requesting_otp');
    try {
      await api.post('/system/api/auth/otp/send', { method: 'EMAIL', action: 'authenticate' });
      setStage('awaiting_otp');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setBindError(ax.response?.data?.message ?? ax.message ?? 'Failed to send verification code.');
      setStage('idle');
    }
  }

  async function poll() {
    const id = txnRef.current;
    if (!id) return;
    if (Date.now() - startedAtRef.current > MAX_POLL_MS) {
      setBindError('Signing attempt timed out.'); setStage('error'); stopPolling(); return;
    }
    try {
      const res = await api.get(`/system/api/auth/e-signature/status/${id}`);
      if (res.data?.data?.status === 'bound') {
        setStage('success'); stopPolling(); onSuccess();
        setTimeout(() => reset(), 1500); return;
      }
      pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setBindError(ax.response?.data?.error?.message ?? ax.message ?? 'Sign step failed.');
      setStage('error'); stopPolling();
    }
  }

  async function startBind() {
    if (!selectedCountry || !selectedProvider) { setBindError('Pick a country and method.'); return; }
    if (!identifier.trim()) { setBindError(`${selectedProvider.identifierLabel} is required.`); return; }
    if (!otpToken.trim()) { setBindError('Verification code is required.'); return; }
    setBindError(''); setStage('initiating');
    try {
      const res = await api.post('/system/api/auth/e-signature/bind', {
        country: selectedCountry, identifier: identifier.trim(),
        providerOverride: selectedProvider.id, otpToken: otpToken.trim(),
      });
      const data = res.data?.data;
      if (!data?.transactionId) throw new Error('Invalid server response.');
      txnRef.current = data.transactionId;
      setDisplayCode(data.displayCode ?? null);
      setStage('awaiting_sign');
      startTicker(data.expiresIn ?? 120);
      pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string; code?: string } } }; message?: string };
      const code = ax.response?.data?.error?.code;
      const message = ax.response?.data?.error?.message ?? (code === 'BIND_2FA_REQUIRED' ? 'The verification code is invalid or expired.' : null) ?? ax.message ?? 'Failed to start signing.';
      setBindError(message);
      setStage(code === 'BIND_2FA_REQUIRED' ? 'awaiting_otp' : 'error');
    }
  }

  return (
    <Modal open={open} onClose={reset} title="Bind a signing certificate" description="Link an e-signature identity (e.g. Mobile signature) to your account." footer={null}>
      <div className="space-y-4">
        {bindError && <AlertBanner variant="error" message={bindError} />}

        {['idle', 'requesting_otp', 'awaiting_otp', 'initiating', 'error'].includes(stage) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Country</label>
                <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); const first = countries.find((c) => c.country === e.target.value)?.providers[0]; setSelectedProviderId(first?.id ?? ''); }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  {countries.map((c) => <option key={c.country} value={c.country}>{c.country}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Method</label>
                <select value={selectedProviderId} onChange={(e) => setSelectedProviderId(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <Input id="bind-identifier" label={selectedProvider?.identifierLabel ?? 'Identifier'} placeholder={selectedProvider?.identifierPlaceholder}
              prefixIcon={<FontAwesomeIcon icon={faMobileScreen} className="w-3.5 h-3.5" />} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            {(stage === 'idle' || stage === 'requesting_otp') ? (
              <Button type="button" fullWidth onClick={requestOtp} loading={stage === 'requesting_otp'}>Send verification code to my email</Button>
            ) : (
              <>
                <Input id="bind-otp" label="Verification code (sent to your email)" inputMode="numeric" pattern="[0-9]*" value={otpToken} onChange={(e) => setOtpToken(e.target.value)} required />
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={requestOtp}>Resend code</Button>
                  <Button type="button" fullWidth onClick={startBind} loading={stage === 'initiating'}>Continue</Button>
                </div>
              </>
            )}
          </>
        )}

        {stage === 'awaiting_sign' && (
          <div className="rounded-lg border border-border bg-surface-raised p-4 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-text-primary">
              <Spinner size="sm" /><span>Open your phone and confirm the signature request.</span>
            </div>
            {displayCode && (
              <div className="rounded-md bg-surface p-3">
                <p className="text-[11px] uppercase tracking-wide text-text-secondary">Verification code</p>
                <p className="font-mono text-2xl font-bold tracking-widest">{displayCode}</p>
                <p className="text-[11px] text-text-secondary mt-1">Make sure this matches the one on your device.</p>
              </div>
            )}
            <p className="text-xs text-text-secondary"><FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 mr-1" />Expires in {secondsLeft}s</p>
            <Button type="button" variant="ghost" fullWidth onClick={reset}>Cancel</Button>
          </div>
        )}

        {stage === 'success' && <AlertBanner variant="success" message="Certificate bound successfully. You can now sign in with it." />}
      </div>
    </Modal>
  );
}

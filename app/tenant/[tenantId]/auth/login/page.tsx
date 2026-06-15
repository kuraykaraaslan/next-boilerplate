'use client';
import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { BrandLogo } from '@/modules_next/common/ui/BrandLogo';
import { LoginForm } from '@/modules_next/auth/ui/LoginForm';
import { OAuthButtons, type OAuthProvider } from '@/modules_next/auth/ui/OAuthButtons';
import { ESignatureLoginPanel } from '@/modules_next/auth_e_signature/ui/ESignatureLoginPanel';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { isRootTenant } from '@/modules/tenant/tenant.constants';

// Refresh token is minted with `notBefore: 5s` (see user_session.token.service.ts).
// Wait past that window before navigating so any early refresh attempt on the
// destination page doesn't hit NotBeforeError → INVALID_TOKEN → login bounce.
const POST_LOGIN_REDIRECT_DELAY_MS = 6000;

function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export default function TenantLoginPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [successMsg, setSuccessMsg] = useState('');
  const [ssoProviders, setSsoProviders] = useState<OAuthProvider[]>([]);
  const [acsProviders, setAcsProviders] = useState<{ provider: string; label: string }[]>([]);
  const [tenantName, setTenantName] = useState('');
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  // Display the tenant's brand/display name instead of the raw tenantId (UUID).
  const displayName = tenantName || tenantId;

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/auth/sso`)
      .then((res) => setSsoProviders((res.data?.providers ?? []) as OAuthProvider[]))
      .catch(() => setSsoProviders([]));

    api.get(`/api/auth/acs`)
      .then((res) => setAcsProviders((res.data?.providers ?? []) as { provider: string; label: string }[]))
      .catch(() => setAcsProviders([]));

    api.get(`/tenant/${tenantId}/api/settings/public`)
      .then((res) => setTenantName(res.data?.settings?.brandName || res.data?.tenant?.name || ''))
      .catch(() => setTenantName(''));
  }, [tenantId]);

  // Shared post-login redirect. Both password and e-signature logins create a
  // session whose refresh token has `notBefore: 5s`, so we wait past that
  // window before navigating to avoid a NotBeforeError → login bounce.
  function finishLogin(message: string) {
    setSuccessMsg(message);
    // Root tenant context = platform login → user picks which workspace
    // to enter (select-tenant). All other tenants land directly in their
    // own admin area. Never redirect into select-tenant from a non-root
    // tenant context.
    const defaultRedirect = isRootTenant(tenantId)
      ? `/tenant/${tenantId}/auth/select-tenant`
      : `/tenant/${tenantId}/admin/me`;
    setTimeout(() => {
      window.location.href = redirectTo ?? defaultRedirect;
    }, POST_LOGIN_REDIRECT_DELAY_MS);
  }

  async function handleLogin(values: { email: string; password: string; rememberMe: boolean }) {
    try {
      await api.post(`/tenant/${tenantId}/api/auth/login`, { email: values.email, password: values.password });
      finishLogin(`Signed in as ${values.email}`);
    } catch (err: any) {
      throw new Error(err.response?.data?.error ?? err.message ?? 'Login failed.');
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/auth/sso/${provider}`);
      const url = res.data?.url;
      if (!url) throw new Error('No SSO URL returned.');
      window.location.href = url;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? err.message ?? 'SSO sign-in failed.');
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo>{displayName.charAt(0).toUpperCase()}</BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary">Sign in to <span className="font-medium">{displayName}</span></p>
        </div>

        {successMsg ? (
          <div className="rounded-lg bg-success-subtle border border-success px-4 py-3 text-center space-y-2">
            <p className="text-sm font-semibold text-success-fg">Signed in successfully!</p>
            <p className="text-sm text-success-fg">{successMsg}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Spinner size="sm" />
              <span className="text-xs text-success-fg">Preparing your session…</span>
            </div>
          </div>
        ) : (
          <>
            {ssoProviders.length > 0 && (
              <OAuthButtons providers={ssoProviders} onProvider={handleOAuth} />
            )}

            {acsProviders.length > 0 && (
              <div className="space-y-2">
                {acsProviders.map((p) => (
                  <button
                    key={p.provider}
                    type="button"
                    onClick={() => { window.location.href = `/api/auth/acs/${p.provider}/initiate?tenantId=${encodeURIComponent(tenantId)}`; }}
                    className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {(ssoProviders.length > 0 || acsProviders.length > 0) && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" aria-hidden="true" />
                <span className="text-xs text-text-secondary">or continue with email</span>
                <div className="flex-1 h-px bg-border" aria-hidden="true" />
              </div>
            )}

            <LoginForm onSubmit={handleLogin} />

            {/* E-signature (e-imza) login. The panel self-hides when no
                providers are configured for this tenant (countries empty). */}
            <ESignatureLoginPanel
              apiBase={`/tenant/${tenantId}`}
              onSuccess={() => finishLogin('Signed in with e-signature')}
            />

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

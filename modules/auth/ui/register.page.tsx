'use client';
import { use, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { BrandLogo } from '@kuraykaraaslan/common/ui/brand-logo.component';
import { useTenantBranding } from '@kuraykaraaslan/tenant_branding/ui/use-tenant-branding.hook';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';
import { RegisterForm } from '@kuraykaraaslan/auth/ui/register-form.component';
import { OAuthButtons, type OAuthProvider } from '@kuraykaraaslan/auth/ui/o-auth-buttons.component';

export default function TenantRegisterPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [successMsg, setSuccessMsg] = useState('');
  const [ssoProviders, setSsoProviders] = useState<OAuthProvider[]>([]);

  // Tenant branding — never show the raw tenantId (UUID).
  const tenantName = useTenantBranding(tenantId).name;

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/auth/sso`)
      .then((res) => setSsoProviders((res.data?.providers ?? []) as OAuthProvider[]))
      .catch(() => setSsoProviders([]));
  }, [tenantId]);

  async function handleRegister(values: { email: string; password: string }) {
    try {
      await api.post(`/tenant/${tenantId}/api/auth/register`, values);
      setSuccessMsg(`Account created for ${values.email}`);
    } catch (err: any) {
      throw new Error(err.response?.data?.error ?? err.message ?? 'Registration failed.');
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/auth/sso/${provider}`);
      const url = res.data?.url;
      if (!url) throw new Error('No SSO URL returned.');
      window.location.href = url;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? err.message ?? 'SSO sign-up failed.');
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <BrandLogo>{tenantName ? tenantName.charAt(0).toUpperCase() : <FontAwesomeIcon icon={faBuilding} />}</BrandLogo>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create Account</h1>
          {tenantName && (
            <p className="text-sm text-text-secondary">Join <span className="font-medium">{tenantName}</span></p>
          )}
        </div>

        {successMsg ? (
          <div className="rounded-lg bg-success-subtle border border-success px-4 py-3 text-center">
            <p className="text-sm font-semibold text-success-fg">Account created!</p>
            <p className="text-sm text-success-fg mt-0.5">{successMsg}</p>
          </div>
        ) : (
          <>
            {ssoProviders.length > 0 && (
              <>
                <OAuthButtons providers={ssoProviders} onProvider={handleOAuth} />

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" aria-hidden="true" />
                  <span className="text-xs text-text-secondary">or register with email</span>
                  <div className="flex-1 h-px bg-border" aria-hidden="true" />
                </div>
              </>
            )}

            <RegisterForm onSubmit={handleRegister} />
          </>
        )}
      </div>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <a href={`/tenant/${tenantId}/auth/login`} className="text-primary font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { Card } from '@nb/common/ui/card.component';
import { Button } from '@nb/common/ui/button.component';
import { Spinner } from '@nb/common/ui/spinner.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faCopy, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';

// SCIM 2.0 (RFC 7644) — IdPs (Okta, Azure AD, OneLogin, Google Workspace) push
// user/group lifecycle events to our SP via bearer-authenticated REST calls.

type ScimToken = {
  apiKeyId: string;
  tenantId: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function PlatformScimTab({ tenantId }: { tenantId: string }) {
  const [tokens, setTokens] = useState<ScimToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [endpoint, setEndpoint] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [revealKey, setRevealKey] = useState('');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEndpoint(`${window.location.origin}/tenant/${tenantId}/api/scim/v2`);
    }
    api.get(`/tenant/${tenantId}/api/api-keys`)
      .then((res) => {
        const all: ScimToken[] = res.data.keys ?? [];
        setTokens(all.filter((k) => k.scopes.some((s) => s.startsWith('scim:'))));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function copy(text: string, which: 'endpoint' | 'token') {
    try { await navigator.clipboard.writeText(text); } catch {}
    if (which === 'endpoint') {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  }

  async function generateToken() {
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/api-keys`, {
        name: `SCIM provisioning token (${new Date().toISOString().slice(0, 10)})`,
        description: 'Generated via Settings → Integrations → SCIM Provisioning',
        scopes: ['scim:read', 'scim:write'],
      });
      setTokens((prev) => [res.data.key, ...prev]);
      setRevealKey(res.data.rawKey);
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? err?.message ?? 'Failed to generate token.');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(apiKeyId: string) {
    setRevoking(apiKeyId);
    try {
      await api.delete(`/tenant/${tenantId}/api/api-keys/${apiKeyId}`);
      setTokens((prev) => prev.filter((t) => t.apiKeyId !== apiKeyId));
    } catch {} finally {
      setRevoking(null);
    }
  }

  function formatDate(val: string | null): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="pt-6 space-y-6">
      <Card
        title="SCIM 2.0 Endpoint"
        subtitle="Configure your IdP (Okta, Azure AD, OneLogin) with this base URL and a bearer token below."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-overlay p-3">
            <code className="flex-1 text-xs font-mono break-all text-text-primary select-all">
              {endpoint || `/tenant/${tenantId}/api/scim/v2`}
            </code>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Copy SCIM endpoint"
              onClick={() => copy(endpoint, 'endpoint')}
              iconLeft={
                <FontAwesomeIcon
                  icon={copiedEndpoint ? faCheck : faCopy}
                  className={copiedEndpoint ? 'text-success' : undefined}
                />
              }
            />
          </div>
          <AlertBanner
            variant="info"
            message="The SCIM v2 module is wired separately. Once enabled, your IdP can push User and Group lifecycle events here."
          />
          <p className="text-xs text-text-secondary leading-relaxed">
            Setup guides: <span className="font-mono">Okta SCIM</span>, <span className="font-mono">Azure AD SCIM</span>, <span className="font-mono">OneLogin SCIM</span>, <span className="font-mono">Google Workspace SCIM</span>.
            Each IdP needs the endpoint above and an active <code>scim:read</code> / <code>scim:write</code> bearer token.
          </p>
        </div>
      </Card>

      <Card
        title="Provisioning Tokens"
        subtitle="Bearer tokens used by your IdP to authenticate against the SCIM endpoint."
      >
        <div className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}
          {revealKey && (
            <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
              <p className="text-xs font-medium text-text-primary">
                Copy this token now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-overlay p-3">
                <code className="flex-1 text-xs font-mono break-all text-text-primary select-all">{revealKey}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label="Copy SCIM token"
                  onClick={() => copy(revealKey, 'token')}
                  iconLeft={
                    <FontAwesomeIcon
                      icon={copiedToken ? faCheck : faCopy}
                      className={copiedToken ? 'text-success' : undefined}
                    />
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setRevealKey('')}>
                  Done
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={generateToken}
              loading={creating}
              iconLeft={<FontAwesomeIcon icon={faKey} />}
            >
              Generate SCIM token
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner size="md" /></div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">
              No SCIM tokens yet. Generate one to connect an IdP.
            </p>
          ) : (
            <div className="border border-border rounded-lg divide-y divide-border">
              {tokens.map((t) => (
                <div key={t.apiKeyId} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{t.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Scopes: {t.scopes.join(', ')}
                      <span className="mx-2">•</span>
                      Last used: {formatDate(t.lastUsedAt)}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revoke(t.apiKeyId)}
                    loading={revoking === t.apiKeyId}
                    iconLeft={<FontAwesomeIcon icon={faTrash} />}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

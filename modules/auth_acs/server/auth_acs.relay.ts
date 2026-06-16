import jwt from 'jsonwebtoken';
import { env } from '@nb/env';

/**
 * RelayState (SAML) / state (OIDC) payload for a normal login: carries the
 * initiating tenant + return path through the IdP round-trip. Signed with
 * CSRF_SECRET so it cannot be forged. The connected-accounts LINK flow uses
 * auth_sso's separate link-state token (a:'link') instead.
 */
interface AcsRelayPayload {
  a: 'acs';
  t?: string; // tenantId
  r?: string; // returnPath (app-relative)
}

const RELAY_TTL_SECONDS = 600;

export function signAcsRelay(tenantId?: string | null, returnPath?: string | null): string {
  const payload: AcsRelayPayload = { a: 'acs', ...(tenantId ? { t: tenantId } : {}), ...(returnPath ? { r: returnPath } : {}) };
  return jwt.sign(payload, env.CSRF_SECRET, { expiresIn: RELAY_TTL_SECONDS });
}

export function parseAcsRelay(relay: string | null | undefined): { tenantId: string | null; returnPath: string | null } | null {
  if (!relay) return null;
  try {
    const decoded = jwt.verify(relay, env.CSRF_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || (decoded as AcsRelayPayload).a !== 'acs') return null;
    const p = decoded as AcsRelayPayload;
    return { tenantId: p.t ?? null, returnPath: p.r ?? null };
  } catch {
    return null;
  }
}

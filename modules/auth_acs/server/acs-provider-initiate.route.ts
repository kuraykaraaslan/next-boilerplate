import { NextRequest, NextResponse } from 'next/server';
import AuthAcsService from '@kuraykaraaslan/auth_acs/server/auth_acs.service';
import { signAcsRelay } from '@kuraykaraaslan/auth_acs/server/auth_acs.relay';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { env } from '@kuraykaraaslan/env';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';

type Params = { params: Promise<{ provider: string }> };

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

/**
 * Start a national-identity login. Platform-level (one fixed ACS URL per
 * provider); the initiating tenant + return path ride along in a signed relay
 * token (RelayState for SAML, state for OIDC).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const rl = await Limiter.checkRateLimit(req, 'auth');
  if (rl) return rl;

  const { provider: raw } = await params;
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  const returnPath = url.searchParams.get('returnPath');
  const loginRedirect = `${APP_HOST}/tenant/${tenantId ?? ROOT_TENANT_ID}/auth/login`;

  try {
    const provider = AuthAcsService.assertKnown(raw);
    const relay = signAcsRelay(tenantId, returnPath);
    const redirectUrl = await AuthAcsService.generateAuthUrl(provider, relay, tenantId ?? undefined);
    return NextResponse.redirect(redirectUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'acs_initiate_failed';
    return NextResponse.redirect(`${loginRedirect}?error=${encodeURIComponent(msg)}`);
  }
}

import { NextResponse } from 'next/server';
import AuthAcsConfigService from '@nb/auth_acs/server/auth_acs.config.service';
import { ACS_CATALOG } from '@nb/auth_acs/server/auth_acs.config';

/** GET /api/auth/acs — enabled national-identity providers, for rendering login buttons. */
export async function GET() {
  const providers = AuthAcsConfigService.enabledProviders().map((p) => ({
    provider: p,
    label: ACS_CATALOG[p].label,
    country: ACS_CATALOG[p].country,
    protocol: ACS_CATALOG[p].protocol,
  }));
  return NextResponse.json({ providers });
}

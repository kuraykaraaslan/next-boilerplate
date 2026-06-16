import crypto from 'crypto';
import Logger from '@nb/logger';
import { NextRequest, NextResponse } from 'next/server';
import SSOService from '@nb/auth_sso/server/auth_sso.service';
import Limiter from '@nb/limiter/server/limiter.service.next';
import { GenerateAuthUrlDTO } from '@nb/auth_sso/server/auth_sso.dto';
import SSOMessages from '@nb/auth_sso/server/auth_sso.messages';
import AuthMessages from '@nb/auth/server/auth.messages';
import { SSOProvider } from '@nb/auth_sso/server/auth_sso.enums';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; provider: string }> }
) {
  const { tenantId, provider } = await params;

  const parsedData = GenerateAuthUrlDTO.safeParse({ provider });

  if (!parsedData.success) {
    Logger.error('Invalid provider parameter:', parsedData.error);
    return NextResponse.json({
      message: parsedData.error.issues.map((err: any) => err.message).join(', '),
    }, { status: 400 });
  }

  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    // GOODTOHAVE (multi-tenancy): gate on this tenant's policy, not just env.
    if (!(await SSOService.isProviderEnabled(provider, tenantId))) {
      return NextResponse.json(
        { message: SSOMessages.INVALID_PROVIDER },
        { status: 400 }
      );
    }

    const state = `${tenantId}.${crypto.randomUUID()}`;
    // GOODTOHAVE (i18n): pass the browser locale through for the consent screen.
    const locale = request.headers.get('accept-language') ?? undefined;
    const url = await SSOService.generateAuthUrl(provider as SSOProvider, state, { tenantId, locale });

    return NextResponse.json({ url, state });
  } catch (error: any) {
    Logger.error(`Error generating SSO link for ${provider} (tenant ${tenantId}):`, error);
    return NextResponse.json(
      { message: AuthMessages.SSO_GENERATION_FAILED },
      { status: 500 }
    );
  }
}

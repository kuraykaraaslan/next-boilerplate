import { NextRequest, NextResponse } from 'next/server';
import SamlService from '@nb/auth_saml/server/auth_saml.service';
import Limiter from '@nb/limiter/server/limiter.service.next';

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const rl = await Limiter.checkRateLimit(req, 'auth');
  if (rl) return rl;

  const { tenantId } = await params;
  try {
    const url = await SamlService.generateAuthUrl(tenantId);
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  }
}

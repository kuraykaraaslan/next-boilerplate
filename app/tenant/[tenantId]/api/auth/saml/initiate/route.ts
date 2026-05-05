import { NextRequest, NextResponse } from 'next/server';
import SamlService from '@/modules/auth_saml/auth_saml.service';
import Limiter from '@/libs/limiter';

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

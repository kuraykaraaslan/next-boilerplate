import Logger from '@kuraykaraaslan/logger';
import { NextRequest, NextResponse } from "next/server";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";
import PasswordService from "@kuraykaraaslan/auth/server/auth.password.service";
import TenantService from "@kuraykaraaslan/tenant/server/tenant.service";
import { ForgotPasswordDTO } from "@kuraykaraaslan/auth/server/auth.dto";
import AuthMessages from "@kuraykaraaslan/auth/server/auth.messages";
import { resolveLocale } from "@kuraykaraaslan/auth/server/auth.i18n";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const _rl = await Limiter.useRateLimit(request, 'auth');

    if (_rl) return _rl;
    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    const parsedData = ForgotPasswordDTO.safeParse(await request.json());
    if (!parsedData.success) {
      return NextResponse.json({
        error: parsedData.error.issues.map((err) => err.message).join(', '),
      }, { status: 400 });
    }

    const locale = resolveLocale(request.headers.get('accept-language'));
    await PasswordService.forgotPassword({ email: parsedData.data.email, tenantId, locale });

    return NextResponse.json({ message: AuthMessages.FORGOT_PASSWORD_SUCCESSFUL }, { status: 200 });
  } catch (error: any) {
    Logger.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

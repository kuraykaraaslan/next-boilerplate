import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from "next/server";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import PasswordService from "@/modules/auth/auth.password.service";
import TenantService from "@/modules/tenant/tenant.service";
import { ForgotPasswordDTO } from "@/modules/auth/auth.dto";
import AuthMessages from "@/modules/auth/auth.messages";

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

    await PasswordService.forgotPassword({ email: parsedData.data.email });

    return NextResponse.json({ message: AuthMessages.FORGOT_PASSWORD_SUCCESSFUL }, { status: 200 });
  } catch (error: any) {
    Logger.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

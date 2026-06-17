// path: app/tenant/[tenantId]/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import AuthService from "@kuraykaraaslan/auth/server/auth.service";
import TenantMemberService from "@kuraykaraaslan/tenant_member/server/tenant_member.service";
import TenantService from "@kuraykaraaslan/tenant/server/tenant.service";
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";
import { RegisterDTO } from "@kuraykaraaslan/auth/server/auth.dto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const _rl = await Limiter.useRateLimit(request, 'auth');

    if (_rl) return _rl;
    // Verify tenant exists and is active
    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({
        error: 'Tenant not found or inactive'
      }, { status: 404 });
    }

    // Check if tenant allows self-registration
    const settings = await SettingService.getByKeys(tenantId, ['allowSelfRegistration']);
    const allowSelfRegistration = settings['allowSelfRegistration'] === 'true';

    if (!allowSelfRegistration) {
      return NextResponse.json({
        error: 'Self-registration is not allowed for this organization'
      }, { status: 403 });
    }

    const parsedData = RegisterDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        error: parsedData.error.issues
      }, { status: 400 });
    }

    const { email, password, phone, consentVersion } = parsedData.data;

    // Register the user. Pass tenantId so the per-tenant password policy,
    // allowRegistration posture (GTH-1), per-tenant bcrypt cost (GTH-6) and the
    // consent record (GTH-7) are all applied in the service layer.
    const { user } = await AuthService.register({ email, password, phone, tenantId, consentVersion });

    if (!user) {
      return NextResponse.json({
        error: 'Failed to create user'
      }, { status: 500 });
    }

    // Add user as a member of this tenant
    const defaultRole = settings['defaultMemberRole'] || 'USER';
    await TenantMemberService.create({
      tenantId,
      userId: user.userId,
      memberRole: defaultRole as 'USER' | 'ADMIN' | 'OWNER',
      memberStatus: 'ACTIVE',
    });

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        userId: user.userId,
        email: user.email,
      },
      tenant: {
        tenantId: tenant.tenantId,
        name: tenant.name,
      }
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

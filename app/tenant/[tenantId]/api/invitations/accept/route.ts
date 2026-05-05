// path: app/tenant/[tenantId]/api/invitations/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantInvitationService from "@/modules/tenant_invitation/tenant_invitation.service";
import { AcceptInvitationDTO } from "@/modules/tenant_invitation/tenant_invitation.dto";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * GET /tenant/[tenantId]/api/invitations/accept?token=
 * Public preview of invitation info (no auth required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const rawToken = new URL(request.url).searchParams.get("token");

    if (!rawToken) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 });
    }

    const { invitation, tenant } = await TenantInvitationService.preview(tenantId, rawToken);

    return NextResponse.json({ invitation, tenant }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

/**
 * POST /tenant/[tenantId]/api/invitations/accept
 * Accept an invitation (system session required — user must be logged in)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const body = await request.json();
    const parsed = AcceptInvitationDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    await TenantInvitationService.accept(tenantId, user.userId, user.email, parsed.data.token);

    return NextResponse.json({ message: "Invitation accepted successfully" }, { status: 200 });
  } catch (error: any) {
    const status = error.message.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ message: error.message }, { status });
  }
}

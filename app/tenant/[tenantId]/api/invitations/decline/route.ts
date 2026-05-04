// path: app/tenant/[tenantId]/api/invitations/decline/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantInvitationService from "@/modules/tenant_invitation/tenant_invitation.service";
import { DeclineInvitationDTO } from "@/modules/tenant_invitation/tenant_invitation.dto";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * POST /tenant/[tenantId]/api/invitations/decline
 * Decline an invitation (system session required — user must be logged in)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    const { tenantId } = await params;

    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const body = await request.json();
    const parsed = DeclineInvitationDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    await TenantInvitationService.decline(tenantId, user.email, parsed.data.token);

    return NextResponse.json({ message: "Invitation declined successfully" }, { status: 200 });
  } catch (error: any) {
    const status = error.message.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ message: error.message }, { status });
  }
}

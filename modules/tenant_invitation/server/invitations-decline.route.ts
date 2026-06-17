// path: app/tenant/[tenantId]/api/invitations/decline/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantInvitationService from "@kuraykaraaslan/tenant_invitation/server/tenant_invitation.service";
import { DeclineInvitationDTO } from "@kuraykaraaslan/tenant_invitation/server/tenant_invitation.dto";
import UserSessionNextService from "@kuraykaraaslan/user_session/server/user_session.service.next";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

/**
 * POST /tenant/[tenantId]/api/invitations/decline
 * Decline an invitation (system session required — user must be logged in)
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

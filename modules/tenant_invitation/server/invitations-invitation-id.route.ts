// path: app/tenant/[tenantId]/api/invitations/[invitationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantInvitationService from "@kuraykaraaslan/tenant_invitation/server/tenant_invitation.service";
import TenantSessionNextService from "@kuraykaraaslan/tenant_session/server/tenant_session.service.next";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/invitations/[invitationId]
 * Get a single invitation (ADMIN+)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; invitationId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, invitationId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const invitation = await TenantInvitationService.getById(invitationId, tenantId);

    return NextResponse.json({ invitation }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode ?? 500 });
  }
}

/**
 * DELETE /tenant/[tenantId]/api/invitations/[invitationId]
 * Revoke an invitation (ADMIN+)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; invitationId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, invitationId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    await TenantInvitationService.revoke(invitationId, tenantId);

    return NextResponse.json({ message: "Invitation revoked successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode ?? 500 });
  }
}

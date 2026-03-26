// path: app/tenant/[tenantId]/api/invitations/[invitationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantInvitationService from "@/modules/tenant_invitation/tenant_invitation.service";
import TenantSessionNextService from "@/modules/tenant_session/tenant_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * GET /tenant/[tenantId]/api/invitations/[invitationId]
 * Get a single invitation (ADMIN+)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; invitationId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    const { tenantId, invitationId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const invitation = await TenantInvitationService.getById(invitationId);

    if (invitation.tenantId !== tenantId) {
      return NextResponse.json({ message: "Invitation not found" }, { status: 404 });
    }

    return NextResponse.json({ invitation }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
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
    await Limiter.checkRateLimit(request);
    const { tenantId, invitationId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    await TenantInvitationService.revoke(invitationId, tenantId);

    return NextResponse.json({ message: "Invitation revoked successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

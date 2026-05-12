// path: app/tenant/[tenantId]/api/invitations/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantInvitationService from "@/modules/tenant_invitation/tenant_invitation.service";
import { SendInvitationDTO, GetInvitationsDTO } from "@/modules/tenant_invitation/tenant_invitation.dto";
import TenantSessionNextService from "@/modules_next/tenant_session/tenant_session.service.next";
import MailService from "@/modules/notification_mail/notification_mail.service";
import Limiter from "@/libs/limiter";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import TenantSubscriptionService from "@/modules/tenant_subscription/tenant_subscription.service";
import { FEATURE_KEYS } from "@/modules/tenant_subscription/tenant_subscription.feature-keys";

/**
 * GET /tenant/[tenantId]/api/invitations
 * List invitations for a tenant (ADMIN+)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const status = searchParams.get("status") as "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "REVOKED" | null || null;

    const parsed = GetInvitationsDTO.safeParse({ tenantId, page, pageSize, status });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const { invitations, total } = await TenantInvitationService.getByTenantId(parsed.data);

    return NextResponse.json({ invitations, total, page, pageSize }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * POST /tenant/[tenantId]/api/invitations
 * Send an invitation (ADMIN+)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const { total: currentMemberCount } = await TenantMemberService.getByTenantId({
      tenantId,
      page: 1,
      pageSize: 1,
      search: null,
      memberRole: null,
      memberStatus: 'ACTIVE',
    });

    await TenantSubscriptionService.assertFeatureAccess(
      tenantId,
      FEATURE_KEYS.MAX_MEMBERS,
      currentMemberCount,
    );

    const body = await request.json();
    const parsed = SendInvitationDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const { invitation, rawToken } = await TenantInvitationService.send(
      tenantId,
      user.userId,
      parsed.data
    );

    // Fetch tenant name for the email
    const tenant = await import("@/modules/tenant/tenant.service").then((m) =>
      m.default.getById(tenantId)
    );

    await MailService.sendTenantInvitationEmail({
      email: invitation.email,
      tenantName: tenant.name,
      memberRole: invitation.memberRole,
      rawToken,
      tenantId,
    });

    return NextResponse.json({ message: "Invitation sent successfully", invitation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

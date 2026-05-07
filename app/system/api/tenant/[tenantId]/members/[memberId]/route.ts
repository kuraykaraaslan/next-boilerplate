// path: app/system/api/tenant/[tenantId]/members/[memberId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import TenantSessionNextService from "@/modules/tenant_session/tenant_session.service.next";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/tenant/[tenantId]/members/[memberId]
 * Get a specific tenant member (system:admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; memberId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, memberId } = await params;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const member = await TenantMemberService.getById(memberId);

    if (member.tenantId !== tenantId) {
      return NextResponse.json({ message: "Member not found in this tenant" }, { status: 404 });
    }

    return NextResponse.json({ member }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PUT /system/api/tenant/[tenantId]/members/[memberId]
 * Update a tenant member role or status (system:admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; memberId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, memberId } = await params;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const memberToUpdate = await TenantMemberService.getById(memberId);

    if (memberToUpdate.tenantId !== tenantId) {
      return NextResponse.json({ message: "Member not found in this tenant" }, { status: 404 });
    }

    const body = await request.json();

    const updated = await TenantMemberService.update(memberId, {
      memberRole: body.memberRole ?? null,
      memberStatus: body.memberStatus ?? null,
    });

    await TenantSessionNextService.clearTenantCache(memberToUpdate.userId, tenantId);

    return NextResponse.json({ message: "Member updated", member: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /system/api/tenant/[tenantId]/members/[memberId]
 * Remove a tenant member (system:admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; memberId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, memberId } = await params;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const memberToDelete = await TenantMemberService.getById(memberId);

    if (memberToDelete.tenantId !== tenantId) {
      return NextResponse.json({ message: "Member not found in this tenant" }, { status: 404 });
    }

    await TenantMemberService.delete(memberId);

    await TenantSessionNextService.clearTenantCache(memberToDelete.userId, tenantId);

    return NextResponse.json({ message: "Member removed" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

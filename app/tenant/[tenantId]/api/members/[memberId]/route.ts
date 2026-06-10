// path: app/tenant/[tenantId]/api/members/[memberId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import TenantSessionNextService from "@/modules_next/tenant_session/tenant_session.service.next";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/members/[memberId]
 * Get a specific member (requires USER role)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; memberId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, memberId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId
    });

    const member = await TenantMemberService.getById(memberId, tenantId);

    return NextResponse.json({ member }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode ?? 500 }
    );
  }
}

/**
 * PUT /tenant/[tenantId]/api/members/[memberId]
 * Update a member (requires ADMIN role)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; memberId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, memberId } = await params;

    const { tenantMember: currentMember } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const memberToUpdate = await TenantMemberService.getById(memberId, tenantId);

    // Prevent non-owners from modifying owners
    if (memberToUpdate.memberRole === 'OWNER' && currentMember.memberRole !== 'OWNER') {
      return NextResponse.json(
        { message: "Only owners can modify other owners" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updatedMember = await TenantMemberService.update(memberId, tenantId, {
      memberRole: body.memberRole || null,
      memberStatus: body.memberStatus || null,
    });

    // Clear tenant cache for the updated member
    await TenantSessionNextService.clearTenantCache(memberToUpdate.userId, tenantId);

    return NextResponse.json({
      message: "Member updated successfully",
      member: updatedMember
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode ?? 500 }
    );
  }
}

/**
 * DELETE /tenant/[tenantId]/api/members/[memberId]
 * Remove a member (requires ADMIN role)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; memberId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, memberId } = await params;

    const { tenantMember: currentMember } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const memberToDelete = await TenantMemberService.getById(memberId, tenantId);

    // Prevent non-owners from removing owners
    if (memberToDelete.memberRole === 'OWNER' && currentMember.memberRole !== 'OWNER') {
      return NextResponse.json(
        { message: "Only owners can remove other owners" },
        { status: 403 }
      );
    }

    // Prevent self-removal if OWNER (would leave tenant without owner)
    if (memberToDelete.tenantMemberId === currentMember.tenantMemberId && memberToDelete.memberRole === 'OWNER') {
      return NextResponse.json(
        { message: "You cannot remove yourself as the owner" },
        { status: 403 }
      );
    }

    await TenantMemberService.delete(memberId, tenantId);

    // Clear tenant cache for the removed member
    await TenantSessionNextService.clearTenantCache(memberToDelete.userId, tenantId);

    return NextResponse.json({
      message: "Member removed successfully"
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode ?? 500 }
    );
  }
}

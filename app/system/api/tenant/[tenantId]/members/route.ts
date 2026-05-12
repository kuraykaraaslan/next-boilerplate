// path: app/system/api/tenant/[tenantId]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * GET /system/api/tenant/[tenantId]/members
 * Get all members of a tenant (requires global ADMIN role)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    // Require global admin role
    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const { searchParams } = new URL(request.url);

    const page = searchParams.get('page') ? parseInt(searchParams.get('page') || '1', 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize') || '10', 10) : 10;
    const search = searchParams.get('search') || null;
    const memberRole = searchParams.get('memberRole') as "USER" | "OWNER" | "ADMIN" | null || null;
    const memberStatus = searchParams.get('memberStatus') as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING" | null || null;

    const { members, total } = await TenantMemberService.getByTenantId({
      tenantId,
      page,
      pageSize,
      search,
      memberRole,
      memberStatus
    });

    return NextResponse.json({
      members,
      total,
      page,
      pageSize
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not authenticated') ? 401 : 500 }
    );
  }
}

/**
 * POST /system/api/tenant/[tenantId]/members
 * Add a new member to the tenant (requires global ADMIN role)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const body = await request.json();

    const newMember = await TenantMemberService.create({
      tenantId,
      userId: body.userId,
      memberRole: body.memberRole || 'USER',
      memberStatus: body.memberStatus || 'ACTIVE'
    });

    return NextResponse.json({
      message: "Member added successfully",
      member: newMember
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

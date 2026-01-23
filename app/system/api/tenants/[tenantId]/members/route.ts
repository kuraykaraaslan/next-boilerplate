// path: app/api/tenant/[tenantId]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import Limiter from "@/libs/limiter";
import TenantSessionNextService from "@/modules/tenant_auth/tenant_session.service.next";

/**
 * GET /api/tenant/[tenantId]/members
 * Get all members of a tenant (requires USER role)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {

  try {
    await Limiter.checkRateLimit(request);

    const { tenantId } = await params;
    
    // Authenticate and verify tenant membership (USER role minimum)
    await TenantSessionNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "USER",
      tenantId: tenantId
    });

    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') || '0', 10) : 0;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize') || '10', 10) : 10;
    const search = searchParams.get('search') || null;
    const memberRole = searchParams.get('memberRole') as "USER" | "OWNER" | "ADMIN" | null || null;
    const memberStatus = searchParams.get('memberStatus') as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING" | null || null;

    // Get members
    const { members, total } = await TenantMemberService.getByTenantId({
      tenantId: tenantId,
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
      { status: error.message.includes('not a member') ? 403 : 500 }
    );
  }
}

/**
 * POST /api/tenant/[tenantId]/members
 * Add a new member to the tenant (requires ADMIN role)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    const { tenantId } = await params;

    // Only ADMIN and OWNER can add members
    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const body = await request.json();

    // Create new member
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

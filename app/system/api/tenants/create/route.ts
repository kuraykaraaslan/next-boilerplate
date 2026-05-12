// path: app/system/api/tenants/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantService from "@/modules/tenant/tenant.service";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * POST /system/api/tenants/create
 * Create a new tenant and make the current user the owner
 * Any authenticated user can create a tenant
 */
export async function POST(request: NextRequest) {
    try {
        const _rl = await Limiter.checkRateLimit(request);
        if (_rl) return _rl;
        // Any authenticated user can create a tenant
        const { user } = await UserSessionNextService.authenticateUserByRequest({
            request
        });

        const body = await request.json();

        if (!body.name || body.name.trim().length < 2) {
            return NextResponse.json({
                success: false,
                message: "Organization name is required (minimum 2 characters)"
            }, { status: 400 });
        }

        // Create the tenant
        const tenant = await TenantService.create({
            name: body.name.trim(),
            description: body.description?.trim() || null,
            region: body.region || 'TR'
        });

        // Add the user as OWNER of the tenant
        await TenantMemberService.create({
            tenantId: tenant.tenantId,
            userId: user.userId,
            memberRole: 'OWNER',
            memberStatus: 'ACTIVE'
        });

        return NextResponse.json({
            success: true,
            tenant: {
                tenantId: tenant.tenantId,
                name: tenant.name,
                description: tenant.description,
                tenantStatus: tenant.tenantStatus,
            },
            message: "Organization created successfully"
        }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

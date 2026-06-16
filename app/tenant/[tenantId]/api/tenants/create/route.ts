import { NextRequest, NextResponse } from "next/server";
import TenantService from "@nb/tenant/server/tenant.service";
import TenantMemberService from "@nb/tenant_member/server/tenant_member.service";
import Limiter from "@nb/limiter/server/limiter.service.next";
import { authenticateAdminRequest } from "@nb/auth/server/auth.admin-guard.next";

/**
 * POST /tenant/[tenantId]/api/tenants/create
 * Root-tenant admin creates a new tenant and is added as the owner.
 */
export async function POST(request: NextRequest) {
    try {
        const _rl = await Limiter.checkRateLimit(request);
        if (_rl) return _rl;

        const auth = await authenticateAdminRequest(request);
        if (!auth.ok) return auth.response;
        const { user } = auth;

        const body = await request.json();

        if (!body.name || body.name.trim().length < 2) {
            return NextResponse.json({
                success: false,
                message: "Organization name is required (minimum 2 characters)"
            }, { status: 400 });
        }

        const tenant = await TenantService.create({
            name: body.name.trim(),
            description: body.description?.trim() || null,
            region: body.region || 'TR'
        });

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

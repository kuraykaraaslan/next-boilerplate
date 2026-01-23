// path: app/system/api/auth/me/tenants/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";
import { prisma } from "@/libs/prisma";

/**
 * GET /system/api/auth/me/tenants
 * Get all tenants the current user is a member of
 */
export async function GET(request: NextRequest) {
    try {
        await Limiter.checkRateLimit(request);

        const { user } = await UserSessionNextService.authenticateUserByRequest({
            request,
            requiredUserRole: "USER"
        });

        // Get all tenant memberships for this user with tenant details
        const memberships = await prisma.tenantMember.findMany({
            where: {
                userId: user.userId,
                memberStatus: 'ACTIVE',
                deletedAt: null,
                tenant: {
                    tenantStatus: 'ACTIVE',
                    deletedAt: null
                }
            },
            include: {
                tenant: {
                    select: {
                        tenantId: true,
                        name: true,
                        description: true,
                        tenantStatus: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const tenants = memberships.map(m => ({
            tenantMemberId: m.tenantMemberId,
            memberRole: m.memberRole,
            memberStatus: m.memberStatus,
            tenant: m.tenant
        }));

        return NextResponse.json({
            success: true,
            tenants
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: error.message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

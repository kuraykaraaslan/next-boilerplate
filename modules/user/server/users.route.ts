import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';

import { NextRequest, NextResponse } from "next/server";
import UserService from "@kuraykaraaslan/user/server/user.service";
import { CreateUserRequestSchema } from "@kuraykaraaslan/user/server/user.dto";
import { authenticateAdminRequest } from "@kuraykaraaslan/auth/server/auth.admin-guard.next";

/**
 * GET /tenant/[tenantId]/api/users
 * Root-tenant admins only.
 */
export async function GET(request: NextRequest) {
    try {
        const _rl = await Limiter.checkRateLimit(request, 'api');
        if (_rl) return _rl;

        const auth = await authenticateAdminRequest(request);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);

        const page = searchParams.get('page') ? parseInt(searchParams.get('page') || '0', 10) : 0;
        const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize') || '10', 10) : 10;
        const search = searchParams.get('search') || undefined;

        const { users, total } = await UserService.getAll({
            page,
            pageSize,
            search
        });

        return NextResponse.json({ users, total, page, pageSize });

    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /tenant/[tenantId]/api/users
 * Root-tenant admins only — KD-13 enforced by guard.
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateAdminRequest(request);
        if (!auth.ok) return auth.response;

        const body = await request.json();

        const parsedData = CreateUserRequestSchema.safeParse(body);

        if (!parsedData.success) {
            return NextResponse.json({
                error: parsedData.error
            }, { status: 400 });
        }

        const { email, password, phone, userRole } = parsedData.data;

        const user = await UserService.create({
            email,
            password,
            phone: phone === null ? undefined : phone,
            userRole
        });

        return NextResponse.json({ user });

    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 500 }
        );
    }
}

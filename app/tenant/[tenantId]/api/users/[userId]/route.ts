import Limiter from '@/modules_next/limiter/limiter.service.next';

import { NextRequest, NextResponse } from "next/server";
import UserService from "@/modules/user/user.service";
import { UpdateUserRequestSchema } from "@/modules/user/user.dto";
import UserMessages from "@/modules/user/user.messages";
import { authenticateAdminRequest } from "@/modules_next/auth/auth.admin-guard.next";

/**
 * GET /tenant/[tenantId]/api/users/[userId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { userId } = await params;

    const user = await UserService.getById(userId);

    if (!user) {
      return NextResponse.json(
        { message: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });

  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /tenant/[tenantId]/api/users/[userId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { userId } = await params;

    const user = await UserService.getById(userId);

    if (!user) {
      return NextResponse.json(
        { message: UserMessages.USER_NOT_FOUND },
        { status: 404 }
      );
    }

    await UserService.delete(userId);

    return NextResponse.json(
      { message: UserMessages.USER_DELETED_SUCCESSFULLY },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /tenant/[tenantId]/api/users/[userId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { userId } = await params;

    const data = await request.json();

    const parsedData = UpdateUserRequestSchema.safeParse(data);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: parsedData.error.issues.map((err: any) => err.message).join(", ") },
        { status: 400 }
      );
    }

    const updatedUser = await UserService.update({ userId, data: parsedData.data });

    if (!updatedUser) {
      return NextResponse.json(
        { message: UserMessages.USER_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: updatedUser });

  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

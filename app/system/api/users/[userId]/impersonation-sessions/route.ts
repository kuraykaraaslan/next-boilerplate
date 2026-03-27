import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import { systemPrisma } from "@/libs/prisma";
import { Prisma } from "@/prisma/system/client";
import { SafeUserSessionSchema } from "@/modules/user_session/user_session.types";

// GET /system/api/users/[userId]/impersonation-sessions
// Audit history of impersonation sessions targeting a user (system admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const { userId } = await params;

    const url      = new URL(request.url);
    const page     = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    const where = {
      userId,
      metadata: { not: Prisma.JsonNull },
      ...(activeOnly ? { sessionExpiry: { gt: new Date() } } : {}),
    };

    const [sessions, total] = await Promise.all([
      systemPrisma.userSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      systemPrisma.userSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions: sessions.map((s) => SafeUserSessionSchema.parse(s)),
      total,
      page,
      pageSize,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

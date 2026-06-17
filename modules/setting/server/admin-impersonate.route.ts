import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";
import { authenticateAdminRequest } from "@kuraykaraaslan/auth/server/auth.admin-guard.next";
import ImpersonationService from "@kuraykaraaslan/auth_impersonation/server/impersonation.service";
import ImpersonationMessages from "@kuraykaraaslan/auth_impersonation/server/impersonation.messages";
import { StartSystemImpersonationDTO } from "@kuraykaraaslan/auth_impersonation/server/impersonation.dto";

function getCookieOptions(request: NextRequest, maxAge: number) {
  const origin = request.headers.get("origin") || "";
  const protocol = request.headers.get("x-forwarded-proto") || request.headers.get("x-scheme") || "http";
  const isSecure = origin.startsWith("https://") || protocol === "https";
  return isSecure
    ? { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", maxAge }
    : { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge };
}

const CLIENT_ERRORS: string[] = [
  ImpersonationMessages.CANNOT_IMPERSONATE_SELF,
  ImpersonationMessages.CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE,
  ImpersonationMessages.TARGET_USER_NOT_FOUND,
  ImpersonationMessages.TARGET_NOT_FOUND,
  ImpersonationMessages.REASON_REQUIRED,
  ImpersonationMessages.STEP_UP_REQUIRED,
  ImpersonationMessages.STEP_UP_INVALID_PASSWORD,
  ImpersonationMessages.STEP_UP_INVALID_TOTP,
  ImpersonationMessages.STEP_UP_METHOD_UNAVAILABLE,
  ImpersonationMessages.IMPERSONATION_CONCURRENCY_LIMIT_REACHED,
  ImpersonationMessages.IMPERSONATION_DISABLED_FOR_TENANT,
];

function statusFor(message: string): number {
  if (message === ImpersonationMessages.STEP_UP_REQUIRED) return 401;
  if (
    message === ImpersonationMessages.STEP_UP_INVALID_PASSWORD ||
    message === ImpersonationMessages.STEP_UP_INVALID_TOTP
  ) return 401;
  if (message === ImpersonationMessages.IMPERSONATION_CONCURRENCY_LIMIT_REACHED) return 429;
  if (
    message === ImpersonationMessages.CANNOT_IMPERSONATE_SELF ||
    message === ImpersonationMessages.CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE ||
    message === ImpersonationMessages.IMPERSONATION_DISABLED_FOR_TENANT
  ) return 403;
  if (CLIENT_ERRORS.includes(message)) return 400;
  return 500;
}

// POST /tenant/[tenantId]/api/admin/impersonate
// Flow 1 (system): a platform super-admin (root-tenant ADMIN) impersonates a
// user in any tenant. Gated by authenticateAdminRequest (root-tenant scope).
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.useRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = StartSystemImpersonationDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { targetUserId, tenantId: targetTenantId, targetTenantRole, reason, stepUp } = parsed.data;

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const { userSession: impersonationSession, rawAccessToken, rawRefreshToken } =
      await ImpersonationService.startSystemImpersonation({
        impersonatorUser: auth.user,
        impersonatorSession: auth.userSession,
        targetUserId,
        tenantId: targetTenantId,
        targetTenantRole,
        reason,
        stepUp,
        ipAddress,
        userAgent,
      });

    const response = NextResponse.json(
      { message: ImpersonationMessages.IMPERSONATION_STARTED, impersonationSession },
      { status: 200 },
    );

    const originalAccessToken = request.cookies.get("accessToken")?.value ?? "";
    const originalRefreshToken = request.cookies.get("refreshToken")?.value ?? "";

    const shortOpts = getCookieOptions(request, 60 * 60);
    const longOpts = getCookieOptions(request, 60 * 60 * 24 * 7);

    response.cookies.set("accessToken", rawAccessToken, shortOpts);
    response.cookies.set("refreshToken", rawRefreshToken, shortOpts);
    response.cookies.set("impersonatorAccessToken", originalAccessToken, shortOpts);
    response.cookies.set("impersonatorRefreshToken", originalRefreshToken, longOpts);

    return response;
  } catch (error: any) {
    const status = statusFor(error?.message);
    return NextResponse.json({ error: error.message }, { status });
  }
}

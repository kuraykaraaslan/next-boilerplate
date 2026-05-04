// path: app/system/api/auth/me/device-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserAgentService from "@/modules/user_agent/user_agent.service";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/auth/me/device-info
 * Return parsed device info and geo-location for the current request
 */
export async function GET(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const userAgent = request.headers.get("user-agent");
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const { deviceInfo, geoLocation, location } = await UserAgentService.getDeviceAndLocation(userAgent, ip);

    return NextResponse.json({ deviceInfo, geoLocation, location }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

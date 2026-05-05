// path: app/system/api/ai/providers/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import AIService from "@/modules/ai/ai.service";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/ai/providers
 * List all AI providers and their configuration status (system:admin)
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:admin"],
    });

    const all = AIService.listProviders();
    const configured = AIService.listConfiguredProviders();

    const providers = all.map((type) => ({
      provider: type,
      configured: configured.includes(type),
    }));

    return NextResponse.json({ providers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

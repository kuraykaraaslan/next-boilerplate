import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@nb/user_session/server/user_session.service.next";
import AIService from "@nb/ai/server/ai.service";
import Limiter from "@nb/limiter/server/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/ai/models
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const modelsByProvider = AIService.listAllModels();
    const models = Object.entries(modelsByProvider).flatMap(([provider, names]) =>
      names.map((model) => ({ model, provider }))
    );

    return NextResponse.json({ models }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

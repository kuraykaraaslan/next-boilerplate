// path: app/system/api/ai/models/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import AIService from "@/modules/ai/ai.service";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/ai/models
 * List all available AI models grouped by provider (system:read)
 */
export async function GET(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const models = AIService.listAllModels();

    return NextResponse.json({ models }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

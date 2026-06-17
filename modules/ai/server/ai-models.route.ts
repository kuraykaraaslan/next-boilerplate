import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@kuraykaraaslan/user_session/server/user_session.service.next";
import AIService from "@kuraykaraaslan/ai/server/ai.service";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/ai/models
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const { tenantId } = await params;
    const modelsByProvider = await AIService.listAllModels(tenantId);
    const models = Object.entries(modelsByProvider).flatMap(([provider, names]) =>
      names.map((model) => ({ model, provider }))
    );

    return NextResponse.json({ models }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

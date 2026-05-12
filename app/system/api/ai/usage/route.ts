// path: app/system/api/ai/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import AIService from "@/modules/ai/ai.service";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import { z } from "zod";

const UsageQuerySchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
  days: z.number().int().positive().max(90).default(30),
});

/**
 * GET /system/api/ai/usage?provider=openai&days=30
 * Get AI token usage statistics (system:admin)
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { searchParams } = new URL(request.url);
    const parsed = UsageQuerySchema.safeParse({
      provider: searchParams.get("provider") ?? undefined,
      days: searchParams.get("days") ? Number(searchParams.get("days")) : 30,
    });

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const { provider, days } = parsed.data;
    const providers = provider ? [provider] : (["openai", "anthropic", "google"] as const);

    const usage: Record<string, { daily: Record<string, number>; total: number }> = {};

    await Promise.all(
      providers.map(async (p) => {
        const [daily, total] = await Promise.all([
          AIService.getUsage(p, days),
          AIService.getTotalUsage(p, days),
        ]);
        usage[p] = { daily, total };
      })
    );

    return NextResponse.json({ usage, days }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@nb/user_session/server/user_session.service.next";
import AIService from "@nb/ai/server/ai.service";
import Limiter from "@nb/limiter/server/limiter.service.next";
import { z } from "zod";

const EmbedDTO = z.object({
  input: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  model: z.string().optional(),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
});

/**
 * POST /tenant/[tenantId]/api/ai/embed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const { tenantId } = await params;
    const body = await request.json();
    const parsed = EmbedDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const response = await AIService.embed(tenantId, parsed.data as any);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    const status = error.code === "NOT_CONFIGURED" ? 503 : error.statusCode ?? 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}

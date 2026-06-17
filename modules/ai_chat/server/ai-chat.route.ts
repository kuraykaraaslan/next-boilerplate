import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@kuraykaraaslan/user_session/server/user_session.service.next";
import AIService from "@kuraykaraaslan/ai/server/ai.service";
import { ChatMessageSchema } from "@kuraykaraaslan/ai/server/ai.types";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";
import { z } from "zod";

const ChatDTO = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  model: z.string().optional(),
  // Any provider key the tenant has (built-in or community). Omit → AIService uses
  // the tenant's selected default provider.
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  systemPrompt: z.string().optional(),
});

/**
 * POST /tenant/[tenantId]/api/ai/chat
 * Authenticated users; provider chain is resolved from the tenant's Settings.
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
    const parsed = ChatDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const response = await AIService.chat(tenantId, parsed.data as any);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    const status = error.code === "NOT_CONFIGURED" ? 503 : error.statusCode ?? 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}

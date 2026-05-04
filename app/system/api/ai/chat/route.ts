// path: app/system/api/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import AIService from "@/modules/ai/ai.service";
import { ChatMessageSchema } from "@/modules/ai/ai.types";
import Limiter from "@/libs/limiter";
import { z } from "zod";

const ChatDTO = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  model: z.string().optional(),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  systemPrompt: z.string().optional(),
});

/**
 * POST /system/api/ai/chat
 * Send a chat completion request (system:read)
 */
export async function POST(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const body = await request.json();
    const parsed = ChatDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const response = await AIService.chat(parsed.data as any);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    const status = error.code === "NOT_CONFIGURED" ? 503 : error.statusCode ?? 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}

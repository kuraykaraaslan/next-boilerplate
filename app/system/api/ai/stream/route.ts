// path: app/system/api/ai/stream/route.ts
import { NextRequest } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import AIService from "@/modules/ai/ai.service";
import { ChatMessageSchema } from "@/modules/ai/ai.types";
import Limiter from "@/libs/limiter";
import { z } from "zod";

export const dynamic = "force-dynamic";

const StreamChatDTO = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  model: z.string().optional(),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  systemPrompt: z.string().optional(),
});

/**
 * POST /system/api/ai/stream
 * Streaming chat completion via SSE (system:read)
 */
export async function POST(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const body = await request.json();
    const parsed = StreamChatDTO.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ message: parsed.error.issues.map((i) => i.message).join(", ") }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await AIService.chatStream(
            { ...parsed.data, stream: true } as any,
            (chunk) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            }
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    const status = error.code === "NOT_CONFIGURED" ? 503 : 500;
    return new Response(JSON.stringify({ message: error.message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

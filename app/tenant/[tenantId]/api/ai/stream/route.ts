import { NextRequest } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import AIService from "@/modules/ai/ai.service";
import { ChatMessageSchema } from "@/modules/ai/ai.types";
import Limiter from "@/modules_next/limiter/limiter.service.next";
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
 * POST /tenant/[tenantId]/api/ai/stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    await UserSessionNextService.authenticateUserByRequest({
      request,
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
            tenantId,
            { ...parsed.data, stream: true } as any,
            (chunk: string) => {
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

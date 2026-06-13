import AIService from '@/modules/ai/ai.service';
import Logger from '@/modules/logger';

/**
 * AI (LLM) classification backstop for message moderation. Only loaded by the
 * async queue worker — never on the synchronous send path. Fail-open by design:
 * any provider error or unparseable output yields "not flagged" so the LLM can
 * never silently quarantine traffic.
 */

const SYSTEM_PROMPT = [
  'You are a strict content-safety classifier for chat messages.',
  'Classify the user message for: harassment, hate, sexual content, violence, self-harm, spam.',
  'Respond with ONLY minified JSON, no prose, no code fences:',
  '{"flagged":boolean,"categories":string[],"score":number}',
  'score is your confidence 0-100 that the message violates policy.',
].join(' ');

export interface AiClassifyResult {
  flagged: boolean;
  categories: string[];
  score: number;
}

const SAFE_DEFAULT: AiClassifyResult = { flagged: false, categories: [], score: 0 };

/** Parse the LLM reply defensively. Never throws; bad output → SAFE_DEFAULT. */
export function safeParse(raw: string): AiClassifyResult {
  try {
    // Strip code fences / surrounding prose, keep the first JSON object.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return SAFE_DEFAULT;
    const parsed = JSON.parse(match[0]) as Partial<AiClassifyResult>;
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    return {
      flagged: Boolean(parsed.flagged),
      categories: Array.isArray(parsed.categories) ? parsed.categories.map(String).slice(0, 16) : [],
      score,
    };
  } catch {
    return SAFE_DEFAULT;
  }
}

/** Classify a message body. Returns SAFE_DEFAULT on any provider/parse failure. */
export async function classifyMessage(tenantId: string, body: string): Promise<AiClassifyResult> {
  try {
    const raw = await AIService.ask(tenantId, body, SYSTEM_PROMPT, { temperature: 0 });
    return safeParse(raw);
  } catch (err) {
    Logger.warn(`[messaging-moderation] AI classify failed for tenant=${tenantId}: ${err}`);
    return SAFE_DEFAULT;
  }
}

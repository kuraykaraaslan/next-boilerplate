import type { Worker } from 'bullmq';
import { createQueue, createWorker } from '@nb/redis/server/redis.bullmq';
import Logger from '@nb/logger';

/**
 * Async AI moderation backstop. The keyword gate runs synchronously on the send
 * path; this queue runs the (slower, costlier) LLM classifier off the request.
 *
 * Requires a running worker — registered in instrumentation.ts under
 * ENABLE_BACKGROUND_JOBS. When no worker drains the queue, AI moderation is
 * simply skipped (the keyword gate still fully enforces).
 */

export const MODERATION_QUEUE_NAME = 'messaging-moderation-ai';

export interface ModerationJob {
  tenantId: string;
  conversationId: string;
  messageId: string;
  body: string;
  mode: string;
  /** True when the message is held PENDING awaiting this verdict (aiHold). */
  held: boolean;
}

const queue = createQueue<ModerationJob>(MODERATION_QUEUE_NAME);

export async function enqueue(job: ModerationJob): Promise<void> {
  await queue.add('classify', job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  });
}

let _worker: Worker<ModerationJob> | null = null;

/** Start the AI moderation worker (idempotent). Called from instrumentation. */
export function startModerationWorker(): Worker<ModerationJob> {
  if (_worker) return _worker;
  _worker = createWorker<ModerationJob>(
    MODERATION_QUEUE_NAME,
    async (job) => {
      // Dynamic import breaks the service ↔ queue static cycle.
      const { default: MessagingModerationService } = await import('./messaging.moderation.service');
      await MessagingModerationService.runAiJob(job.data);
    },
    { concurrency: 2 },
  );
  _worker.on('failed', (job, err) => {
    Logger.error(`[messaging-moderation] AI job failed (message=${job?.data.messageId}): ${err?.message}`);
    // Final-attempt fail-open: never strand a held message.
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1) && job.data.held) {
      import('./messaging.moderation.service')
        .then((m) => m.default.releaseHeld(job.data.tenantId, job.data.messageId))
        .catch(() => {});
    }
  });
  Logger.info('[messaging-moderation] AI worker started');
  return _worker;
}

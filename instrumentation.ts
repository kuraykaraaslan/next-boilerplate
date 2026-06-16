/**
 * Next.js instrumentation hook — runs once when the server boots.
 *
 * Responsibilities:
 *  1. Initialise observability (Sentry + Prometheus) so the very first
 *     request lands in the registry. Lazy-no-op when toggles are off.
 *  2. Optionally register background-job schedulers (BullMQ recurring jobs)
 *     for self-hosted deployments. Serverless deploys leave
 *     `ENABLE_BACKGROUND_JOBS=false` and trigger cron via HTTP endpoints
 *     under `/api/tenant/{ROOT}/api/cron/*`.
 *
 * Next.js auto-detects this file — no `next.config.ts` flag needed.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { default: ObservabilityService } = await import('@nb/observability');
  await ObservabilityService.init();

  if (process.env.ENABLE_BACKGROUND_JOBS === 'true') {
    const { default: Logger } = await import('@nb/logger');

    // Wrap each scheduler in its own try — one missing module mustn't
    // block the rest. Modules that aren't present (e.g. SSL job in OSS)
    // log a warning and the rest still come up.
    const schedulers: Array<[string, () => Promise<unknown>]> = [
      [
        'subscription-expire',
        async () => {
          const { scheduleSubscriptionExpireJob } = await import(
            '@nb/tenant_subscription/server/tenant_subscription.job'
          );
          await scheduleSubscriptionExpireJob();
        },
      ],
      [
        'dormant-sweep',
        async () => {
          const { scheduleDormantSweepJob } = await import('@nb/auth/server/auth.dormant.job');
          await scheduleDormantSweepJob();
        },
      ],
      [
        'tenant-usage-flush',
        async () => {
          const { scheduleUsageFlushJob } = await import('@nb/tenant_usage/server/tenant_usage.job');
          await scheduleUsageFlushJob();
        },
      ],
      [
        'tenant-purge',
        async () => {
          const { scheduleTenantPurgeJob } = await import('@nb/tenant/server/tenant.deletion.job');
          await scheduleTenantPurgeJob();
        },
      ],
      [
        'tenant-domain-dns-recheck',
        async () => {
          const { scheduleDnsRecheckJob } = await import(
            '@nb/tenant_domain/server/tenant_domain.job'
          );
          await scheduleDnsRecheckJob();
        },
      ],
      [
        'messaging-moderation-ai',
        async () => {
          const { startModerationWorker } = await import(
            '@nb/messaging/server/messaging.moderation.queue'
          );
          startModerationWorker();
        },
      ],
      [
        'storage-virus-scan',
        async () => {
          const { startVirusScanWorker } = await import('@nb/storage/server/storage.scan.job');
          startVirusScanWorker();
        },
      ],
      [
        'gift-card-expiry',
        async () => {
          const { scheduleGiftCardExpiryJob } = await import('@nb/gift_card/server/gift_card.expiry.job');
          await scheduleGiftCardExpiryJob();
        },
      ],
    ];

    for (const [name, run] of schedulers) {
      try {
        await run();
      } catch (err) {
        Logger.warn(
          `[instrumentation] scheduler "${name}" not started: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    Logger.info(`[instrumentation] background jobs scheduled (${schedulers.length} queues)`);
  }
}

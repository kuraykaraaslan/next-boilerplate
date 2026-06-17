/**
 * OpenTelemetry distributed tracing initialiser.
 *
 * Only activates when OTEL_ENABLED=true and the @opentelemetry/sdk-node
 * package is installed.  The boilerplate ships with zero OTel runtime cost
 * for operators who don't opt in — the dynamic import means the SDK is never
 * loaded unless the flag is set.
 *
 * Recommended install:
 *   npm install @opentelemetry/sdk-node \
 *               @opentelemetry/exporter-trace-otlp-http \
 *               @opentelemetry/auto-instrumentations-node
 */
import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';

let _otelInitialized = false;

export async function initOtel(): Promise<void> {
  if (_otelInitialized) return;
  _otelInitialized = true;

  if (!env.OTEL_ENABLED) return;

  try {
    const [sdkMod, exporterMod, autoMod] = await Promise.all([
      import('@opentelemetry/sdk-node' as string),
      import('@opentelemetry/exporter-trace-otlp-http' as string),
      import('@opentelemetry/auto-instrumentations-node' as string),
    ]) as any[];

    const { NodeSDK } = sdkMod;
    const { OTLPTraceExporter } = exporterMod;
    const { getNodeAutoInstrumentations } = autoMod;

    const exporter = new OTLPTraceExporter({
      url: env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    });

    const sdk = new NodeSDK({
      serviceName: env.OTEL_SERVICE_NAME ?? 'next-boilerplate',
      traceExporter: exporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable noisy file-system instrumentation.
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    sdk.start();

    // Flush spans on graceful shutdown.
    process.once('beforeExit', () => sdk.shutdown().catch(() => {}));

    Logger.info('[observability] OpenTelemetry tracing initialised');
  } catch (err) {
    // SDK not installed or OTLP endpoint unreachable — log once and continue.
    Logger.warn(
      `[observability] OTel SDK not available — OTEL_ENABLED=true but packages are missing. ` +
        `Install with: npm install @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/auto-instrumentations-node. ` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

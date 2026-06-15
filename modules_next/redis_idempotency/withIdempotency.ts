import { NextRequest, NextResponse } from 'next/server';
import { RedisIdempotencyService } from '@/modules/redis_idempotency';

function extractTenantId(pathname: string): string {
  return pathname.match(/\/tenant\/([^/]+)/)?.[1] ?? 'unknown';
}

/**
 * HTTP-layer idempotency for mutating route handlers, keyed on the
 * `Idempotency-Key` request header. No header → the handler runs unchanged.
 *
 *  - **Atomic claim** (SET NX via `acquire`) so two concurrent duplicates can't
 *    both execute.
 *  - A duplicate that arrives *after* completion replays the stored response
 *    (`Idempotency-Replayed: true`).
 *  - A duplicate that arrives while the first is still in flight gets `409`.
 *  - **Only 2xx responses are cached**; a non-2xx (or thrown handler) releases
 *    the claim so a genuine retry can proceed instead of being stuck for 24h.
 *  - Redis down → fail-open (the handler runs without the guarantee).
 */
export function withIdempotency<Ctx>(
  handler: (request: NextRequest, context: Ctx) => Promise<NextResponse>,
): (request: NextRequest, context: Ctx) => Promise<NextResponse> {
  return async (request: NextRequest, context: Ctx): Promise<NextResponse> => {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) return handler(request, context);

    try {
      RedisIdempotencyService.validateKey(idempotencyKey);
    } catch {
      return NextResponse.json(
        { message: 'Idempotency-Key must be 8-255 chars of [A-Za-z0-9._:-].' },
        { status: 422 },
      );
    }

    const tenantId = extractTenantId(request.nextUrl.pathname);
    const claim = await RedisIdempotencyService.acquire(tenantId, idempotencyKey);

    // Someone else owns the key (and Redis is healthy).
    if (!claim.acquired && !claim.degraded) {
      if (claim.existing?.status === 'completed' && claim.existing.response) {
        return NextResponse.json(claim.existing.response.body, {
          status: claim.existing.response.statusCode,
          headers: { 'Idempotency-Replayed': 'true' },
        });
      }
      return NextResponse.json(
        { message: 'A request with this Idempotency-Key is already being processed.' },
        { status: 409, headers: { 'Retry-After': '1' } },
      );
    }

    let response: NextResponse;
    try {
      response = await handler(request, context);
    } catch (err) {
      if (!claim.degraded) await RedisIdempotencyService.release(tenantId, idempotencyKey);
      throw err;
    }

    if (response.status >= 200 && response.status < 300) {
      const body = await response.clone().json().catch(() => null);
      await RedisIdempotencyService.setCompleted(tenantId, idempotencyKey, {
        body,
        statusCode: response.status,
      });
    } else if (!claim.degraded) {
      // Never cache a failure — the client should be able to retry.
      await RedisIdempotencyService.release(tenantId, idempotencyKey);
    }

    return response;
  };
}

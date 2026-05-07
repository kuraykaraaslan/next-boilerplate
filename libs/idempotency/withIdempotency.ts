import { NextRequest, NextResponse } from 'next/server';
import { IdempotencyKey } from './index';

type Handler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Wraps a POST/PUT route handler with idempotency key support.
 * The client passes `Idempotency-Key: <uuid>` header.
 * If the same key is seen again with a completed response, the cached response is returned.
 * If a request is in-flight (pending), returns 409.
 */
export function withIdempotency(handler: Handler): Handler {
  return async (request: NextRequest): Promise<NextResponse> => {
    const idempotencyKey = request.headers.get('Idempotency-Key');

    if (!idempotencyKey) {
      return handler(request);
    }

    const existing = await IdempotencyKey.get(idempotencyKey);

    if (existing?.status === 'pending') {
      return NextResponse.json(
        { error: 'Request is already being processed' },
        { status: 409, headers: { 'Retry-After': '1' } }
      );
    }

    if (existing?.status === 'completed' && existing.response) {
      return NextResponse.json(existing.response.body, {
        status: existing.response.statusCode,
        headers: { 'Idempotency-Replayed': 'true' },
      });
    }

    await IdempotencyKey.setPending(idempotencyKey);

    const response = await handler(request);
    const body = await response.clone().json().catch(() => null);

    await IdempotencyKey.setCompleted(idempotencyKey, {
      body,
      statusCode: response.status,
    });

    return response;
  };
}

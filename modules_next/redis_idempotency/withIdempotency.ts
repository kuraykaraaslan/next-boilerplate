import { NextRequest, NextResponse } from 'next/server';
import { IdempotencyKey } from '@/modules/redis_idempotency';

type Handler = (request: NextRequest) => Promise<NextResponse>;

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
        { status: 409, headers: { 'Retry-After': '1' } },
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

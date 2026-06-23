import { NextRequest, NextResponse } from 'next/server';
import { statusCodeFor, toErrorResponse } from '@kuraykaraaslan/common/server/app-error';

/** Extract the upload origin (IP + UA) the same way the storage/audit layers do. */
export function clientOrigin(request: NextRequest): { ip?: string; userAgent?: string } {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    undefined;
  const userAgent = request.headers.get('user-agent') ?? undefined;
  return { ip, userAgent };
}

/** Map any thrown error to a JSON response with its proper status code. */
export function errorResponse(error: unknown): NextResponse {
  const { message } = toErrorResponse(error);
  return NextResponse.json({ message }, { status: statusCodeFor(error) });
}

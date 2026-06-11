import { NextResponse } from 'next/server';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SCIM_SCHEMAS, SCIM_CONTENT_TYPE, type ScimErrorBody, type ScimErrorType } from './scim.types';

/** AppError subclass that also carries a SCIM `scimType` vocab string.
 *  The `status` getter keeps existing route catch blocks working
 *  (`err?.status ?? 500`) without modification. */
export class ScimError extends AppError {
  readonly scimType?: ScimErrorType;

  constructor(message: string, statusCode: number, code: ErrorCode, scimType?: ScimErrorType) {
    super(message, statusCode, code);
    this.name = 'ScimError';
    this.scimType = scimType;
  }

  get status(): number { return this.statusCode; }
}

/**
 * Build a SCIM-spec compliant error response (RFC 7644 §3.12).
 *
 * - `Content-Type` is always `application/scim+json` so IdPs parse the body.
 * - `status` is duplicated in the body as a string per the spec.
 * - `scimType` is set only on 4xx where the spec defines a vocabulary
 *   (`invalidFilter`, `uniqueness`, …).
 */
export function scimError(
  status: number,
  detail: string,
  scimType?: ScimErrorType,
): NextResponse {
  const body: ScimErrorBody = {
    schemas: [SCIM_SCHEMAS.ERROR],
    status: String(status),
    detail,
  };
  if (scimType) body.scimType = scimType;
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': SCIM_CONTENT_TYPE },
  });
}

/**
 * Build a successful SCIM JSON response with the correct content type.
 * Accepts an optional `Location` header for `201 Created` responses
 * (RFC 7644 §3.3 — required for resource creation).
 */
export function scimResponse(body: unknown, init?: { status?: number; location?: string; etag?: string }): NextResponse {
  const headers: Record<string, string> = { 'Content-Type': SCIM_CONTENT_TYPE };
  if (init?.location) headers['Location'] = init.location;
  if (init?.etag) headers['ETag'] = init.etag;
  return new NextResponse(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers,
  });
}

/**
 * 204 No Content — used by DELETE. SCIM requires no body and no
 * Content-Type when the response carries no body.
 */
export function scimNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

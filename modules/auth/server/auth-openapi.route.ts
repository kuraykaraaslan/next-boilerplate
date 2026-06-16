// path: app/tenant/[tenantId]/api/auth/openapi/route.ts
// GTH-16: machine-readable OpenAPI / JSON-Schema contract for the auth DTOs.
// Integrators (identity brokers, middleware vendors) can fetch this to codegen
// against the auth API. Public read-only document; no tenant data is exposed.
import { NextResponse } from 'next/server';
import { buildAuthOpenApiDocument } from '@nb/auth/server/auth.openapi';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(buildAuthOpenApiDocument(), {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}

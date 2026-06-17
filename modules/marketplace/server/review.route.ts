// path: app/tenant/[ROOT]/api/marketplace/review/route.ts  (system scope)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@kuraykaraaslan/auth/server/auth.admin-guard.next';
import { listReviewQueue, listPublishers } from '@kuraykaraaslan/marketplace/server/publish.service.next';

/**
 * GET — the super-admin review surface: pending version submissions + pending
 * publisher applications. Root-tenant admin only.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const [queue, pendingPublishers] = await Promise.all([
      listReviewQueue(),
      listPublishers('pending'),
    ]);
    return NextResponse.json({ success: true, queue, pendingPublishers });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed' }, { status: 500 });
  }
}

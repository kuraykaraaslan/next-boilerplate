// path: app/tenant/[ROOT]/api/marketplace/publishers/[publisherId]/route.ts  (system scope)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@kuraykaraaslan/auth/server/auth.admin-guard.next';
import { setPublisherStatus } from '@kuraykaraaslan/marketplace/server/publish.service.next';
import type { PublisherStatus } from '@kuraykaraaslan/marketplace/server/entities/publisher.entity';

const VALID: PublisherStatus[] = ['pending', 'verified', 'suspended'];

/** PUT { status: 'verified'|'suspended'|'pending' } — verify/suspend a publisher. Root admin only. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ publisherId: string }> },
) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { publisherId } = await params;
    const body = await request.json();
    if (!VALID.includes(body?.status)) {
      return NextResponse.json({ success: false, message: `status must be one of ${VALID.join(', ')}` }, { status: 400 });
    }
    const publisher = await setPublisherStatus(publisherId, body.status, auth.user.userId);
    return NextResponse.json({ success: true, publisher });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed' }, { status: 400 });
  }
}

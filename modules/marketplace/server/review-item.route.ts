// path: app/tenant/[ROOT]/api/marketplace/review/[versionId]/route.ts  (system scope)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@kuraykaraaslan/auth/server/auth.admin-guard.next';
import { reviewVersion } from '@kuraykaraaslan/marketplace/server/publish.service.next';

/** PUT { decision: 'approve'|'reject', notes? } — review a submitted version. Root admin only. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { versionId } = await params;
    const body = await request.json();
    const decision = body?.decision;
    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ success: false, message: "decision must be 'approve' or 'reject'" }, { status: 400 });
    }
    const version = await reviewVersion(versionId, decision, body?.notes, auth.user.userId);
    return NextResponse.json({ success: true, version });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to review' }, { status: 400 });
  }
}

import Limiter from '@/modules_next/limiter/limiter.service.next';
import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from 'next/server';
import StorageService from '@/modules/storage/storage.service';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';

/**
 * POST /tenant/[tenantId]/api/storage
 * Upload a file to storage for a tenant
 *
 * Body (FormData):
 * - file: File (required)
 * - folder: string (optional, default: 'general')
 * - provider: StorageProviderType (optional, uses default)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const auth = await UserSessionNextService.authenticateUserByRequest({ request });

    const { tenantId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'general';
    const provider = formData.get('provider') as any;

    if (!file) {
      return NextResponse.json(
        { message: 'File is required' },
        { status: 400 }
      );
    }

    // Capture upload origin for fraud / GDPR audit (country is inferred from IP
    // server-side). Same header extraction the session/audit layers use.
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;
    const userId = (auth as any)?.user?.userId ?? (auth as any)?.user?.id ?? undefined;

    const result = await StorageService.uploadFile(tenantId, {
      file,
      folder: folder,
      tenantId,
      provider,
      userId,
      origin: { ip, userAgent },
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      uploadedFileId: result.uploadedFileId,
      url: result.url,
      key: result.key,
      bucket: result.bucket,
      size: result.size,
      provider: result.provider,
    });
  } catch (error: any) {
    Logger.error(error.message);
    return NextResponse.json(
      { message: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

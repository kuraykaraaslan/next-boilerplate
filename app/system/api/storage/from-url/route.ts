import Limiter from '@/libs/limiter';
'use server'
import Logger from '@/libs/logger';
import { NextRequest, NextResponse } from 'next/server'
import StorageService from '@/modules/storage/storage.service'
import UserSessionNextService from '@/modules/user_session/user_session.service.next'

/**
 * POST /api/storage/from-url
 * Upload a file from URL to storage
 * 
 * Body (JSON):
 * - url: string (required)
 * - folder: string (optional, default: 'general')
 * - filename: string (optional)
 * - provider: StorageProviderType (optional, uses default)
 */
export async function POST(request: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request })

    const { url, folder, filename, provider } = await request.json()

    if (!url) {
      return NextResponse.json(
        { message: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

      new URL(url)
    } catch {
      return NextResponse.json(
        { message: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const result = await StorageService.uploadFromUrl({
      url,
      folder: folder || 'general',
      filename,
      provider,
      tenantId: 'system',
    })

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: result.url,
      key: result.key,
      bucket: result.bucket,
      size: result.size,
      provider: result.provider,
    })
  } catch (error: any) {
    Logger.error(error.message)
    return NextResponse.json(
      { message: error.message || 'Failed to upload file from URL' },
      { status: 500 }
    )
  }
}

// path: app/system/api/storage/route.ts
import Logger from '@/libs/logger';
import { NextRequest, NextResponse } from 'next/server'
import StorageService from '@/modules/storage/storage.service'
import UserSessionNextService from '@/modules/user_session/user_session.service.next'
import Limiter from '@/libs/limiter'

/**
 * GET /system/api/storage?key=...
 * Get a pre-signed / public URL for a stored file
 */
export async function GET(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request)
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:read"] })

    const key = new URL(request.url).searchParams.get('key')
    if (!key) {
      return NextResponse.json({ message: 'key is required' }, { status: 400 })
    }

    const url = await StorageService.getFileUrl({ key })
    return NextResponse.json({ url }, { status: 200 })
  } catch (error: any) {
    Logger.error(error.message)
    return NextResponse.json({ message: error.message || 'Failed to get file URL' }, { status: 500 })
  }
}

/**
 * POST /system/api/storage
 * Upload a file to storage
 *
 * Body (FormData):
 * - file: File (required)
 * - folder: string (optional, default: 'general')
 * - provider: StorageProviderType (optional, uses default)
 */
export async function POST(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request)
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:read"] })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'general'
    const provider = formData.get('provider') as any

    if (!file) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 })
    }

    const result = await StorageService.uploadFile({ file, folder, provider, tenantId: 'system' })

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
    return NextResponse.json({ message: error.message || 'Failed to upload file' }, { status: 500 })
  }
}

/**
 * DELETE /system/api/storage
 * Delete a file from storage
 *
 * Body: { key: string, provider?: StorageProviderType }
 */
export async function DELETE(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request)
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] })

    const body = await request.json()
    const { key, provider } = body

    if (!key) {
      return NextResponse.json({ message: 'key is required' }, { status: 400 })
    }

    await StorageService.deleteFile({ key, provider })
    return NextResponse.json({ message: 'File deleted' }, { status: 200 })
  } catch (error: any) {
    Logger.error(error.message)
    return NextResponse.json({ message: error.message || 'Failed to delete file' }, { status: 500 })
  }
}

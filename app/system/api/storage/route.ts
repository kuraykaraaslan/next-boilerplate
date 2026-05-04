import Logger from '@/libs/logger';
'use server'

import { NextRequest, NextResponse } from 'next/server'
import StorageService from '@/modules/storage/storage.service'
import UserSessionNextService from '@/modules/user_session/user_session.service.next'

/**
 * POST /api/storage
 * Upload a file to storage
 * 
 * Body (FormData):
 * - file: File (required)
 * - folder: string (optional, default: 'general')
 * - provider: StorageProviderType (optional, uses default)
 */
export async function POST(request: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'general'
    const provider = formData.get('provider') as any

    if (!file) {
      return NextResponse.json(
        { message: 'File is required' },
        { status: 400 }
      )
    }

    const result = await StorageService.uploadFile({
      file,
      folder,
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
      { message: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}

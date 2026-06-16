import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import DynamicPageService from '@nb/dynamic_page/server/dynamic_page.service'
import { runBlockHandler } from '@nb/dynamic_page/server/dynamic/partials/BlockActionSandbox'
import { AppError } from '@nb/common/server/app-error'
import DynamicPageMessages from '@nb/dynamic_page/server/dynamic_page.messages'

async function handleBlockAction(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; blockType: string }> },
) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl

  const { tenantId, blockType } = await params

  let block
  try {
    const blocks = await DynamicPageService.listBlocks(tenantId)
    block = blocks.find((b) => b.type === blockType)
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500
    return NextResponse.json({ message: err.message }, { status })
  }

  if (!block) {
    return NextResponse.json({ message: DynamicPageMessages.BLOCK_NOT_FOUND }, { status: 404 })
  }

  if (!block.serverHandler) {
    return NextResponse.json({ message: DynamicPageMessages.BLOCK_NO_HANDLER }, { status: 404 })
  }

  const allowedCollections = block.allowedCollections ?? []

  let body: unknown = null
  if (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT') {
    try {
      body = await request.json()
    } catch {
      body = null
    }
  }

  const sp = new URL(request.url).searchParams
  const query: Record<string, string> = {}
  sp.forEach((value, key) => { query[key] = value })

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => { headers[key] = value })

  try {
    const result = await runBlockHandler({
      handlerCode: block.serverHandler,
      allowedCollections,
      tenantId,
      req: { method: request.method, body, query, headers },
    })
    return NextResponse.json(result.data, { status: result.status })
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}

export const GET = handleBlockAction
export const POST = handleBlockAction
export const PATCH = handleBlockAction
export const DELETE = handleBlockAction

import vm from 'vm'
import DynamicCollectionService from '@/modules/dynamic_page/dynamic_collection.service'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import DynamicPageMessages from '@/modules/dynamic_page/dynamic_page.messages'

const HANDLER_TIMEOUT_MS = 3000

interface HandlerRequest {
  method: string
  body: unknown
  query: Record<string, string>
  headers: Record<string, string>
}

interface HandlerContext {
  req: HandlerRequest
  method: string
  body: unknown
  query: Record<string, string>
  db: ReturnType<typeof DynamicCollectionService.makeDbHelper>
  tenantId: string
  respond: (data: unknown, status?: number) => HandlerResult
}

interface HandlerResult {
  data: unknown
  status: number
}

export async function runBlockHandler(opts: {
  handlerCode: string
  allowedCollections: string[]
  tenantId: string
  req: HandlerRequest
}): Promise<HandlerResult> {
  const { handlerCode, allowedCollections, tenantId, req } = opts

  let result: HandlerResult | undefined

  const respond = (data: unknown, status = 200): HandlerResult => {
    result = { data, status }
    return result
  }

  const db = DynamicCollectionService.makeDbHelper(tenantId, allowedCollections)

  const ctx: HandlerContext = {
    req,
    method: req.method,
    body: req.body,
    query: req.query,
    db,
    tenantId,
    respond,
  }

  // Wrap the stored handler code in an async IIFE so it can use await
  const wrappedCode = `
    (async function(__ctx) {
      const { req, method, body, query, db, tenantId, respond } = __ctx;
      ${handlerCode}
      if (typeof handler === 'function') {
        return await handler(__ctx);
      }
    })(__ctx)
  `

  try {
    const sandbox = vm.createContext({ __ctx: ctx, Promise, console: { log: () => {}, error: () => {} } })
    const script = new vm.Script(wrappedCode)
    const promise = script.runInContext(sandbox, { timeout: HANDLER_TIMEOUT_MS })
    await Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new AppError(DynamicPageMessages.BLOCK_HANDLER_TIMEOUT, 408, ErrorCode.INTERNAL_ERROR)), HANDLER_TIMEOUT_MS),
      ),
    ])
  } catch (err: any) {
    if (err instanceof AppError) throw err
    throw new AppError(`${DynamicPageMessages.BLOCK_HANDLER_FAILED}: ${err.message}`, 500, ErrorCode.INTERNAL_ERROR)
  }

  if (!result) {
    return { data: null, status: 200 }
  }
  return result
}

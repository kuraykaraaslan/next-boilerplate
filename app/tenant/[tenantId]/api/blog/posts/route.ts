import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import BlogPostService from '@/modules/blog/blog.post.service'
import { CreatePostDTO, GetPostsQuery } from '@/modules/blog/blog.dto'

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const sp = new URL(request.url).searchParams
    const query = GetPostsQuery.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
      status: sp.get('status') ?? undefined,
      categoryId: sp.get('categoryId') ?? undefined,
      authorId: sp.get('authorId') ?? undefined,
      search: sp.get('search') ?? undefined,
      sort: sp.get('sort') ?? undefined,
    })
    const result = await BlogPostService.list(tenantId, query)
    return NextResponse.json(result)
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = CreatePostDTO.parse(await request.json())
    const post = await BlogPostService.create(tenantId, dto)
    return NextResponse.json({ post }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}

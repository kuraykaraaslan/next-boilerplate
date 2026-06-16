// Catch-all tenant API dispatcher. Module-owned API handlers (declared in
// module.json `apiRoutes`, living in modules/<id>/server/*.route.ts) are served
// here: the path resolves to a handler, which runs only when its module is
// enabled for the tenant. A disabled module's endpoints simply 404. Specific
// file routes (cron, streaming, etc.) take precedence over this catch-all.
import { NextRequest, NextResponse } from 'next/server';
import { moduleRegistry } from '@nb/common/server/module-registry';
import { getEnabledModuleIds } from '@nb/setting/server/module-activation.service.next';
import { apiHandlers } from '@nb/common/server/generated/api-handlers';

// nodejs (handlers use TypeORM/Node APIs); force-dynamic so streaming (SSE)
// handlers aren't cached; 300s ceiling so long jobs (e.g. the demo-reset cron)
// can run. These apply to every dispatched handler.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Ctx = { params: Promise<{ tenantId: string; slug?: string[] }> };

async function dispatch(method: string, request: NextRequest, ctx: Ctx): Promise<Response> {
  const { tenantId, slug } = await ctx.params;
  const apiPath = '/api/' + (slug?.join('/') ?? '');

  const match = moduleRegistry.findApiRoute(apiPath);
  if (!match) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const enabled = await getEnabledModuleIds(tenantId);
  if (!enabled.has(match.route.moduleId)) {
    return NextResponse.json({ message: `Module "${match.route.moduleId}" is disabled` }, { status: 404 });
  }

  const loader = apiHandlers[match.route.handlerId];
  if (!loader) return NextResponse.json({ message: 'Handler not found' }, { status: 404 });

  const mod = await loader();
  const handler = mod[method];
  if (typeof handler !== 'function') {
    return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
  }

  // Hand the verbatim handler the same shape Next gives a file route: a params
  // promise of { tenantId, ...routeParams }.
  return handler(request, { params: Promise.resolve({ tenantId, ...match.params }) });
}

export const GET = (req: NextRequest, ctx: Ctx) => dispatch('GET', req, ctx);
export const POST = (req: NextRequest, ctx: Ctx) => dispatch('POST', req, ctx);
export const PUT = (req: NextRequest, ctx: Ctx) => dispatch('PUT', req, ctx);
export const PATCH = (req: NextRequest, ctx: Ctx) => dispatch('PATCH', req, ctx);
export const DELETE = (req: NextRequest, ctx: Ctx) => dispatch('DELETE', req, ctx);
export const HEAD = (req: NextRequest, ctx: Ctx) => dispatch('HEAD', req, ctx);
export const OPTIONS = (req: NextRequest, ctx: Ctx) => dispatch('OPTIONS', req, ctx);

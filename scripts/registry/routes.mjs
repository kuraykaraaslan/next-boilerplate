// Route inventory — walks app/ for route.ts handlers.

import { APP_DIR, walk, rel, readText } from './fs-utils.mjs';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function parseRouteMethods(source) {
  const found = new Set();
  for (const m of HTTP_METHODS) {
    const re = new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${m}\\b`);
    if (re.test(source)) found.add(m);
  }
  return [...found];
}

function urlPathForRouteFile(routeFile) {
  // routeFile relative to /app, ending in /route.ts
  // app/system/api/users/route.ts            -> /system/api/users
  // app/tenant/[tenantId]/api/.../route.ts   -> /tenant/[tenantId]/api/...
  const r = rel(routeFile).replace(/^app\//, '').replace(/\/route\.ts$/, '');
  // Strip Next route groups like (group)/
  return '/' + r.split('/').filter((seg) => !(seg.startsWith('(') && seg.endsWith(')'))).join('/');
}

function moduleForRoute(urlPath) {
  // Heuristic: pull the segment after /api/ (skipping the "admin" gate
  // segment used by /system/api/admin/<thing>) and snake-case it. The
  // segment may already be pluralized (users -> user) so try both forms.
  const m = urlPath.match(/\/api\/(?:admin\/)?([^/[]+)/);
  if (!m) return undefined;
  const seg = m[1].replace(/-/g, '_');
  const singular = seg.endsWith('ies') ? seg.slice(0, -3) + 'y'
                 : seg.endsWith('s')   ? seg.slice(0, -1)
                 : seg;
  return MODULE_ID_ALIASES[seg] ?? MODULE_ID_ALIASES[singular] ?? singular;
}

const MODULE_ID_ALIASES = {
  users: 'user',
  tenants: 'tenant',
  payments: 'payment',
  coupons: 'coupon',
  webhooks: 'webhook',
  settings: 'setting',
  notifications: 'notification_inapp',
  sessions: 'user_session',
  'audit-logs': 'audit_log',
  audit_logs: 'audit_log',
  'api-keys': 'api_key',
  api_keys: 'api_key',
  'social-accounts': 'user_social_account',
  social_accounts: 'user_social_account',
  storage: 'storage',
  branding: 'tenant_branding',
  domains: 'tenant_domain',
  invitations: 'tenant_invitation',
  members: 'tenant_member',
  subscriptions: 'tenant_subscription',
  usage: 'tenant_usage',
  export: 'tenant_export',
  exports: 'tenant_export',
};

export async function collectRoutes() {
  const files = await walk(APP_DIR, (full, name) => name === 'route.ts');
  const routes = [];
  for (const file of files) {
    const src = (await readText(file)) ?? '';
    const urlPath = urlPathForRouteFile(file);
    const scope = urlPath.startsWith('/system') ? 'system'
                : urlPath.startsWith('/tenant') ? 'tenant'
                : 'system';
    routes.push({
      filePath: rel(file),
      scope,
      urlPath,
      methods: parseRouteMethods(src),
      module: moduleForRoute(urlPath),
      dynamic: /\[[^\]]+\]/.test(urlPath),
    });
  }
  routes.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
  return routes;
}

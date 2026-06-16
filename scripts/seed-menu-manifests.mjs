// Migration aid (run once, review output): parse the hardcoded nav groups in
// AdminShell.tsx and emit, per owning module, the `menu` block to paste into
// modules/<id>/module.json — converting the remaining ~36 hardcoded items into
// manifest-declared, enable/disable-aware menu entries.
//
// Module ownership is a heuristic from the href segment; REVIEW before applying.
//
// Usage: node scripts/seed-menu-manifests.mjs

import fs from 'node:fs';

const SRC = fs.readFileSync('modules/common/ui/layout/AdminShell.tsx', 'utf8');

// href segment (after /admin/) -> owning module id. Extend/correct as needed.
const OWNER = {
  '': 'tenant', pages: 'dynamic_page', blocks: 'dynamic_page',
  'blog/posts': 'blog', 'blog/categories': 'blog',
  members: 'tenant_member', invitations: 'tenant_invitation', domains: 'tenant_domain',
  subscription: 'tenant_subscription', coupons: 'coupon', 'gift-cards': 'coupon',
  wallet: 'payment', metering: 'tenant_usage', approvals: 'tenant', support: 'messaging',
  analytics: 'tenant_usage', 'feature-flags': 'setting', search: 'common',
  'store/categories': 'store', 'store/products': 'store', 'store/bundles': 'store',
  saml: 'auth_saml', webhooks: 'webhook', 'api-keys': 'api_key',
  integrations: 'webhook', 'api-docs': 'api_doc', ai: 'ai',
  settings: 'setting', 'settings/branding': 'tenant_branding', terms: 'tenant',
  consent: 'tenant', me: 'user', tenants: 'tenant', users: 'user',
  'audit-logs': 'audit_log', health: 'common', fleet: 'common',
};

// FontAwesome import-name -> manifest icon string.
const ICON = (fa) => 'fas fa-' + fa.replace(/^fa/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

const groupRe = /label:\s*'([^']+)',\s*\n\s*items:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/g;
const itemRe = /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*href:\s*`[^`]*\/admin\/?([^`]*)`,\s*icon:\s*<FontAwesomeIcon icon=\{(\w+)\}/g;

const byModule = {};
let g;
let platformSeen = false;
while ((g = groupRe.exec(SRC))) {
  const groupLabel = g[1];
  // crude scope heuristic: groups after the platform arrays are system-scope
  if (groupLabel === 'Platform' || groupLabel === 'Platform System') platformSeen = true;
  const scope = platformSeen ? 'system' : 'tenant';
  let it;
  let order = 10;
  while ((it = itemRe.exec(g[2]))) {
    const [, id, label, seg, faIcon] = it;
    const owner = OWNER[seg] ?? 'tenant';
    (byModule[owner] ??= []).push({
      id, label, href: '/admin/' + seg, icon: ICON(faIcon),
      group: groupLabel, order: order += 1, scope,
    });
  }
}

console.log('// Suggested manifest `menu` blocks (review module ownership!):\n');
for (const [mod, items] of Object.entries(byModule).sort()) {
  console.log(`// modules/${mod}/module.json`);
  console.log(JSON.stringify({ menu: items }, null, 2));
  console.log('');
}

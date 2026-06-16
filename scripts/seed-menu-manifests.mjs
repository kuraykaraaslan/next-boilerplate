// One-time: write each admin sidebar item into its owning module's manifest
// `menu` block, so pages are owned by modules (and become enable/disable- and
// route-gate-aware). Icons are emitted from the real FontAwesome iconName so the
// runtime icon-map resolves them. Run with --apply to write; otherwise dry-run.
//
//   node scripts/seed-menu-manifests.mjs [--apply]

import fs from 'node:fs';
import path from 'node:path';
import {
  faFileAlt, faPuzzlePiece, faNewspaper, faFolderOpen, faPeopleGroup, faEnvelope,
  faGlobe, faCreditCard, faKey, faGift, faWallet, faGaugeHigh, faClipboardCheck,
  faLifeRing, faChartLine, faToggleOn, faMagnifyingGlass, faTag, faBoxOpen,
  faLayerGroup, faIdCard, faPlug, faBook, faRobot, faGear, faShieldHalved,
  faFileContract, faCookieBite, faBuilding, faUsers, faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';

const ic = (i) => `fas fa-${i.iconName}`;

// [ id, label, path-after-/admin/, moduleId, group, faIcon, scope ]
const ITEMS = [
  ['pages', 'Pages', 'pages', 'dynamic_page', 'Content', faFileAlt, 'tenant'],
  ['blocks', 'Blocks', 'blocks', 'dynamic_page', 'Content', faPuzzlePiece, 'tenant'],
  ['blog-posts', 'Posts', 'blog/posts', 'blog', 'Blog', faNewspaper, 'tenant'],
  ['blog-categories', 'Categories', 'blog/categories', 'blog', 'Blog', faFolderOpen, 'tenant'],
  ['members', 'Members', 'members', 'tenant_member', 'Management', faPeopleGroup, 'tenant'],
  ['invitations', 'Invitations', 'invitations', 'tenant_invitation', 'Management', faEnvelope, 'tenant'],
  ['domains', 'Domains', 'domains', 'tenant_domain', 'Management', faGlobe, 'tenant'],
  ['subscription', 'Subscription', 'subscription', 'tenant_subscription', 'Management', faCreditCard, 'tenant'],
  ['coupons', 'Coupons', 'coupons', 'coupon', 'Commerce', faKey, 'tenant'],
  ['gift-cards', 'Gift Cards', 'gift-cards', 'gift_card', 'Commerce', faGift, 'tenant'],
  ['wallet', 'Wallet', 'wallet', 'wallet', 'Commerce', faWallet, 'tenant'],
  ['metering', 'Metering', 'metering', 'metering', 'Commerce', faGaugeHigh, 'tenant'],
  ['approvals', 'Approvals', 'approvals', 'approval', 'Operations', faClipboardCheck, 'tenant'],
  ['support', 'Support Tickets', 'support', 'support', 'Operations', faLifeRing, 'tenant'],
  ['analytics', 'Analytics', 'analytics', 'analytics', 'Insights', faChartLine, 'tenant'],
  ['feature-flags', 'Feature Flags', 'feature-flags', 'feature_flags', 'Insights', faToggleOn, 'tenant'],
  ['search', 'Search', 'search', 'search', 'Insights', faMagnifyingGlass, 'tenant'],
  ['store-categories', 'Categories', 'store/categories', 'store', 'Store', faTag, 'tenant'],
  ['store-products', 'Products', 'store/products', 'store', 'Store', faBoxOpen, 'tenant'],
  ['store-bundles', 'Bundles', 'store/bundles', 'store', 'Store', faLayerGroup, 'tenant'],
  ['saml', 'SAML SSO', 'saml', 'auth_saml', 'Security', faIdCard, 'tenant'],
  ['webhooks', 'Webhooks', 'webhooks', 'webhook', 'Security', faPlug, 'tenant'],
  ['api-keys', 'API Keys', 'api-keys', 'api_key', 'Developer', faKey, 'tenant'],
  ['integrations', 'Integrations', 'integrations', 'integrations_hub', 'Developer', faPlug, 'tenant'],
  ['api-docs', 'API Docs', 'api-docs', 'api_doc', 'Developer', faBook, 'tenant'],
  ['ai', 'AI', 'ai', 'ai', 'Developer', faRobot, 'tenant'],
  ['branding', 'Branding', 'settings/branding', 'tenant_branding', 'Configuration', faShieldHalved, 'tenant'],
  ['agreements', 'Agreements', 'terms', 'terms_consent', 'Configuration', faFileContract, 'tenant'],
  ['consent', 'Consent', 'consent', 'terms_consent', 'Configuration', faCookieBite, 'tenant'],
  ['platform-tenants', 'Tenants', 'tenants', 'tenant', 'Platform', faBuilding, 'system'],
  ['platform-users', 'Users', 'users', 'user', 'Platform', faUsers, 'system'],
  ['platform-audit-logs', 'Audit Logs', 'audit-logs', 'audit_log', 'Platform', faClockRotateLeft, 'system'],
];

const APPLY = process.argv.includes('--apply');
const byModule = {};
for (const [id, label, seg, mod, group, faIcon, scope] of ITEMS) {
  (byModule[mod] ??= []).push({
    id, label, href: `/admin/${seg}`, icon: ic(faIcon), group,
    order: (byModule[mod]?.length ?? 0) * 10 + 10, scope,
  });
}

let n = 0;
for (const [mod, items] of Object.entries(byModule)) {
  const p = path.join('modules', mod, 'module.json');
  if (!fs.existsSync(p)) { console.warn(`! no manifest for ${mod}, skipping`); continue; }
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const existing = Array.isArray(j.menu) ? j.menu : [];
  const seen = new Set(existing.map((m) => m.id));
  const merged = [...existing, ...items.filter((it) => !seen.has(it.id))];
  if (!APPLY) { console.log(`${mod}: +${merged.length - existing.length} menu items`); continue; }
  j.menu = merged;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  n++;
}
console.log(APPLY ? `Applied menu blocks to ${n} manifests.` : '(dry-run; pass --apply)');

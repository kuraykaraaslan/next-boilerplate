import { createHash } from 'node:crypto';
import type { OrderContext } from './terms_consent.agreements.types';

/** SHA-256 hex digest of a string — the content fingerprint stored on every record. */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Replace `{{ key }}` placeholders in a template with values from `vars`. Keys may
 * be dotted (`order.total`). Unknown placeholders are replaced with an empty
 * string so a published legal document never leaks raw `{{…}}` markers. Returns
 * both the rendered text and the list of placeholders that had no value (so the
 * admin/render path can warn on an incompletely-configured template).
 */
export function interpolate(
  template: string,
  vars: Record<string, string>,
): { text: string; missing: string[] } {
  const missing: string[] = [];
  const text = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== undefined) {
      return vars[key];
    }
    missing.push(key);
    return '';
  });
  return { text, missing: [...new Set(missing)] };
}

function formatMoney(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${n.toFixed(2)} ${currency}`;
}

/** Seller legal identity, as read from settings, used to render order documents. */
export interface SellerLegal {
  name?: string;
  address?: string;
  taxOffice?: string;
  taxId?: string;
  mersis?: string;
  email?: string;
  phone?: string;
}

/**
 * Build the flat, dotted-key variable map a distance-selling / pre-information
 * template interpolates against. Pure — the caller supplies order + seller data.
 */
export function buildOrderVars(order: OrderContext, seller: SellerLegal): Record<string, string> {
  const itemsText = (order.items ?? [])
    .map(
      (it) =>
        `- ${it.name} x${it.quantity} — ${formatMoney(it.total ?? it.unitPrice * it.quantity, order.currency)}`,
    )
    .join('\n');

  return {
    'order.ref': order.orderRef,
    'order.date': order.orderDate ?? '',
    'order.total': formatMoney(order.total, order.currency),
    'order.currency': order.currency,
    'order.items': itemsText,
    'buyer.name': order.buyer?.name ?? '',
    'buyer.email': order.buyer?.email ?? '',
    'buyer.phone': order.buyer?.phone ?? '',
    'buyer.address': order.buyer?.address ?? '',
    'seller.name': seller.name ?? '',
    'seller.address': seller.address ?? '',
    'seller.taxOffice': seller.taxOffice ?? '',
    'seller.taxId': seller.taxId ?? '',
    'seller.mersis': seller.mersis ?? '',
    'seller.email': seller.email ?? '',
    'seller.phone': seller.phone ?? '',
  };
}

/**
 * Render an order-specific agreement template against order + seller data and
 * return the final text plus its content hash. The hash is over the *rendered*
 * text, so it pins the exact document the buyer sees.
 */
export function renderOrderTemplate(
  template: string,
  order: OrderContext,
  seller: SellerLegal,
): { content: string; contentHash: string; missing: string[] } {
  const { text, missing } = interpolate(template, buildOrderVars(order, seller));
  return { content: text, contentHash: sha256Hex(text), missing };
}

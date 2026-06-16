import { describe, it, expect } from 'vitest';
import { sha256Hex, interpolate, buildOrderVars, renderOrderTemplate } from '../terms_consent.render';
import type { OrderContext } from '../terms_consent.agreements.types';

describe('sha256Hex', () => {
  it('is deterministic and 64 hex chars', () => {
    const a = sha256Hex('hello');
    expect(a).toBe(sha256Hex('hello'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it('changes with content (tamper-evidence)', () => {
    expect(sha256Hex('a')).not.toBe(sha256Hex('a ')); // trailing space matters
  });
});

describe('interpolate', () => {
  it('replaces known placeholders, supports dotted + spaced keys', () => {
    const { text, missing } = interpolate('Hi {{buyer.name}} / {{ order.ref }}', {
      'buyer.name': 'Ada',
      'order.ref': 'ORD-1',
    });
    expect(text).toBe('Hi Ada / ORD-1');
    expect(missing).toEqual([]);
  });
  it('blanks unknown placeholders and reports them once', () => {
    const { text, missing } = interpolate('{{a}}-{{b}}-{{a}}', { a: 'X' });
    expect(text).toBe('X--X');
    expect(missing).toEqual(['b']);
  });
});

describe('buildOrderVars', () => {
  const order: OrderContext = {
    orderRef: 'ORD-9',
    currency: 'TRY',
    total: 150,
    items: [
      { name: 'Widget', quantity: 2, unitPrice: 50 },
      { name: 'Gizmo', quantity: 1, unitPrice: 50, total: 50 },
    ],
    buyer: { name: 'Ada Lovelace', email: 'ada@example.com' },
    orderDate: '2026-06-15',
  };
  const seller = { name: 'Acme Ltd', taxId: '1234567890' };

  it('flattens order + seller into dotted keys', () => {
    const v = buildOrderVars(order, seller);
    expect(v['order.ref']).toBe('ORD-9');
    expect(v['order.total']).toBe('150.00 TRY');
    expect(v['buyer.name']).toBe('Ada Lovelace');
    expect(v['seller.name']).toBe('Acme Ltd');
    expect(v['seller.taxId']).toBe('1234567890');
    // missing seller fields become empty strings, never undefined
    expect(v['seller.mersis']).toBe('');
  });

  it('formats the item list with computed line totals', () => {
    const v = buildOrderVars(order, seller);
    expect(v['order.items']).toContain('Widget x2 — 100.00 TRY');
    expect(v['order.items']).toContain('Gizmo x1 — 50.00 TRY');
  });
});

describe('renderOrderTemplate', () => {
  const order: OrderContext = { orderRef: 'ORD-1', currency: 'TRY', total: 99.9 };
  const seller = { name: 'Acme' };

  it('renders + hashes the final text', () => {
    const r = renderOrderTemplate('Seller {{seller.name}} sells for {{order.total}}', order, seller);
    expect(r.content).toBe('Seller Acme sells for 99.90 TRY');
    expect(r.contentHash).toBe(sha256Hex('Seller Acme sells for 99.90 TRY'));
  });

  it('hash differs once order data differs (per-order pinning)', () => {
    const a = renderOrderTemplate('{{order.total}}', { ...order, total: 10 }, seller);
    const b = renderOrderTemplate('{{order.total}}', { ...order, total: 20 }, seller);
    expect(a.contentHash).not.toBe(b.contentHash);
  });
});

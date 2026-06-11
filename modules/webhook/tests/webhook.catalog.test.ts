import { describe, it, expect } from 'vitest';
import {
  WEBHOOK_EVENT_CATALOG,
  catalogForScope,
  groupedCatalogForScope,
  scopeForTenant,
} from '../webhook.catalog';
import { WEBHOOK_EVENTS } from '../webhook.enums';

describe('webhook catalog', () => {
  it('has exactly one entry for every enum event (parity)', () => {
    for (const e of WEBHOOK_EVENTS) {
      expect(WEBHOOK_EVENT_CATALOG[e]).toBeDefined();
    }
    expect(Object.keys(WEBHOOK_EVENT_CATALOG).sort()).toEqual([...WEBHOOK_EVENTS].sort());
  });

  it('scopeForTenant maps root → platform and others → tenant', () => {
    expect(scopeForTenant(true)).toBe('platform');
    expect(scopeForTenant(false)).toBe('tenant');
  });

  it('catalogForScope returns only events of the requested scope', () => {
    expect(catalogForScope('tenant').every((e) => e.scope === 'tenant')).toBe(true);
    expect(catalogForScope('platform').every((e) => e.scope === 'platform')).toBe(true);
    expect(catalogForScope('tenant').length + catalogForScope('platform').length).toBe(WEBHOOK_EVENTS.length);
  });

  it('groupedCatalogForScope covers every scoped event exactly once', () => {
    const groups = groupedCatalogForScope('platform');
    const flat = groups.flatMap((g) => g.events.map((e) => e.event));
    expect(new Set(flat).size).toBe(flat.length);
    expect(flat.length).toBe(catalogForScope('platform').length);
  });
});

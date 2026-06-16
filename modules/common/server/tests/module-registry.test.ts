import { describe, it, expect } from 'vitest';
import { matchesFilter, moduleRegistry } from '../module-registry';

const item = (over: Partial<{ moduleId: string; scope: 'system' | 'tenant' | 'both'; permissions: string[] }> = {}) => ({
  moduleId: 'blog',
  scope: 'both' as const,
  permissions: [] as string[],
  ...over,
});

describe('matchesFilter', () => {
  it('includes everything when no filter is given', () => {
    expect(matchesFilter(item(), {})).toBe(true);
  });

  it('filters by enabled module set', () => {
    expect(matchesFilter(item({ moduleId: 'blog' }), { enabledIds: new Set(['blog']) })).toBe(true);
    expect(matchesFilter(item({ moduleId: 'blog' }), { enabledIds: new Set(['shop']) })).toBe(false);
  });

  it('matches scope, with "both" always matching', () => {
    expect(matchesFilter(item({ scope: 'tenant' }), { scope: 'tenant' })).toBe(true);
    expect(matchesFilter(item({ scope: 'system' }), { scope: 'tenant' })).toBe(false);
    expect(matchesFilter(item({ scope: 'both' }), { scope: 'system' })).toBe(true);
  });

  it('gates on permissions only when a permission set is supplied', () => {
    const needsPerm = item({ permissions: ['blog.read'] });
    // no permission set -> not gated (v1 default)
    expect(matchesFilter(needsPerm, {})).toBe(true);
    // permission set provided and satisfied
    expect(matchesFilter(needsPerm, { permissions: ['blog.read', 'x'] })).toBe(true);
    // permission set provided and missing
    expect(matchesFilter(needsPerm, { permissions: ['other'] })).toBe(false);
  });

  it('combines enabled + scope + permission', () => {
    const it1 = item({ moduleId: 'blog', scope: 'tenant', permissions: ['blog.read'] });
    expect(matchesFilter(it1, { enabledIds: new Set(['blog']), scope: 'tenant', permissions: ['blog.read'] })).toBe(true);
    expect(matchesFilter(it1, { enabledIds: new Set(['blog']), scope: 'system', permissions: ['blog.read'] })).toBe(false);
  });
});

describe('findPageRoute (dynamic admin routing)', () => {
  it('resolves an admin path to the module page declared in its manifest routes', () => {
    const m = moduleRegistry.findPageRoute('/admin/ai');
    expect(m?.route.componentId).toBe('ai/ui/ai.page');
    expect(m?.route.moduleId).toBe('ai');
    expect(m?.params).toEqual({});
  });

  it('matches by exact segment count (ai/settings is its own route)', () => {
    expect(moduleRegistry.findPageRoute('/admin/ai/settings')?.route.componentId).toBe('ai/ui/settings.page');
  });

  it('returns undefined for paths no module page claims (catch-all 404s)', () => {
    expect(moduleRegistry.findPageRoute('/admin')).toBeUndefined();
    expect(moduleRegistry.findPageRoute('/admin/totally-unknown')).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { extensionRegistry } from '../extension-registry';

// These assertions run against the real build-time `module-runtime.json`, which
// carries the three ai:provider contributions (ai_openai / ai_anthropic /
// ai_google). They exercise the gating logic the host AIProviderService relies
// on; `load()` is covered indirectly by ai.service.test.ts.

describe('extensionRegistry.getContributions', () => {
  it('returns every contribution to a point when unfiltered', () => {
    const all = extensionRegistry.getContributions('ai:provider');
    const keys = all.map((c) => c.key).sort();
    expect(keys).toEqual(['anthropic', 'google', 'openai']);
  });

  it('filters by the tenant enabled-module set', () => {
    const only = extensionRegistry.getContributions('ai:provider', {
      enabledIds: new Set(['ai', 'ai_openai']),
    });
    expect(only.map((c) => c.key)).toEqual(['openai']);
  });

  it('grows as more provider modules are enabled', () => {
    const two = extensionRegistry.getContributions('ai:provider', {
      enabledIds: new Set(['ai', 'ai_openai', 'ai_anthropic']),
    });
    expect(two.map((c) => c.key).sort()).toEqual(['anthropic', 'openai']);
  });

  it('returns nothing when no contributing module is enabled', () => {
    const none = extensionRegistry.getContributions('ai:provider', {
      enabledIds: new Set(['ai']),
    });
    expect(none).toHaveLength(0);
  });

  it('returns nothing for an unknown point', () => {
    expect(extensionRegistry.getContributions('nope:nope')).toHaveLength(0);
  });
});

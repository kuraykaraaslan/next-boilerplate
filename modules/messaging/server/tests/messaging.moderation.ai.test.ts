import { describe, it, expect, vi } from 'vitest';

vi.mock('@nb/env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('@nb/ai/server/ai.service', () => ({ default: { ask: vi.fn() } }));
vi.mock('@nb/logger', () => ({ default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { safeParse } from '../messaging.moderation.ai';

describe('safeParse', () => {
  it('parses strict JSON', () => {
    expect(safeParse('{"flagged":true,"categories":["spam"],"score":88}')).toEqual({
      flagged: true,
      categories: ['spam'],
      score: 88,
    });
  });

  it('extracts JSON from a fenced/prose reply', () => {
    const raw = '```json\n{"flagged":false,"categories":[],"score":3}\n```';
    expect(safeParse(raw)).toEqual({ flagged: false, categories: [], score: 3 });
  });

  it('fails open on garbage', () => {
    expect(safeParse('I cannot comply')).toEqual({ flagged: false, categories: [], score: 0 });
  });

  it('clamps score to 0-100 and coerces types', () => {
    expect(safeParse('{"flagged":1,"categories":"x","score":250}').score).toBe(100);
    expect(safeParse('{"flagged":true,"score":-9}').score).toBe(0);
    expect(safeParse('{"flagged":true,"categories":"x","score":50}').categories).toEqual([]);
  });
});

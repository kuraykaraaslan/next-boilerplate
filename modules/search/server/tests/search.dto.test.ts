import { describe, it, expect } from 'vitest';
import { IndexDocDTO, RemoveDocDTO, SearchQueryDTO } from '../search.dto';

describe('IndexDocDTO', () => {
  it('accepts a full document', () => {
    const r = IndexDocDTO.safeParse({
      entityType: 'blog_post',
      entityId: '42',
      title: 'Hello',
      body: 'world',
      url: 'https://example.com/blog/hello',
      metadata: { author: 'me' },
    });
    expect(r.success).toBe(true);
  });

  it('defaults body to empty string', () => {
    const r = IndexDocDTO.parse({ entityType: 'p', entityId: '1', title: 'T' });
    expect(r.body).toBe('');
  });

  it('requires entityType, entityId, title', () => {
    expect(IndexDocDTO.safeParse({ entityId: '1', title: 'T' }).success).toBe(false);
    expect(IndexDocDTO.safeParse({ entityType: 'p', title: 'T' }).success).toBe(false);
    expect(IndexDocDTO.safeParse({ entityType: 'p', entityId: '1' }).success).toBe(false);
  });

  it('rejects a non-URL url', () => {
    expect(
      IndexDocDTO.safeParse({ entityType: 'p', entityId: '1', title: 'T', url: 'not a url' }).success,
    ).toBe(false);
  });
});

describe('RemoveDocDTO', () => {
  it('requires both keys', () => {
    expect(RemoveDocDTO.safeParse({ entityType: 'p', entityId: '1' }).success).toBe(true);
    expect(RemoveDocDTO.safeParse({ entityType: 'p' }).success).toBe(false);
  });
});

describe('SearchQueryDTO', () => {
  it('coerces limit/offset and applies defaults', () => {
    const r = SearchQueryDTO.parse({ q: 'hello' });
    expect(r).toMatchObject({ q: 'hello', limit: 20, offset: 0 });
  });

  it('coerces string limit/offset from query params', () => {
    const r = SearchQueryDTO.parse({ q: 'hi', limit: '50', offset: '10' });
    expect(r).toMatchObject({ limit: 50, offset: 10 });
  });

  it('rejects empty q and over-cap limit', () => {
    expect(SearchQueryDTO.safeParse({ q: '' }).success).toBe(false);
    expect(SearchQueryDTO.safeParse({ q: 'x', limit: '500' }).success).toBe(false);
  });
});

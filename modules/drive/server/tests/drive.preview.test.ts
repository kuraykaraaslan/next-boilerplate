import { describe, it, expect } from 'vitest';
import { previewKindFor } from '../drive.policy';

describe('previewKindFor', () => {
  it('classifies images', () => {
    expect(previewKindFor('image/png')).toBe('image');
    expect(previewKindFor('image/jpeg')).toBe('image');
  });
  it('classifies pdf', () => {
    expect(previewKindFor('application/pdf')).toBe('pdf');
  });
  it('classifies text-like types', () => {
    expect(previewKindFor('text/plain')).toBe('text');
    expect(previewKindFor('application/json')).toBe('text');
    expect(previewKindFor('application/xml')).toBe('text');
  });
  it('classifies audio and video', () => {
    expect(previewKindFor('audio/mpeg')).toBe('audio');
    expect(previewKindFor('video/mp4')).toBe('video');
  });
  it('returns none for unknown / missing types', () => {
    expect(previewKindFor('application/octet-stream')).toBe('none');
    expect(previewKindFor(null)).toBe('none');
    expect(previewKindFor(undefined)).toBe('none');
  });
});

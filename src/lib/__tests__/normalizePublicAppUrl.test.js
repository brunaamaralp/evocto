import { describe, it, expect } from 'vitest';
import { normalizePublicAppUrl } from '../../../lib/server/materialAppwrite.js';

describe('normalizePublicAppUrl', () => {
  it('keeps bare origin', () => {
    expect(normalizePublicAppUrl('https://mktevocto.netlify.app')).toBe(
      'https://mktevocto.netlify.app'
    );
  });

  it('strips accidental /review path used for login links', () => {
    expect(normalizePublicAppUrl('http://mktevocto.netlify.app/review')).toBe(
      'http://mktevocto.netlify.app'
    );
    expect(normalizePublicAppUrl('https://mktevocto.netlify.app/review/')).toBe(
      'https://mktevocto.netlify.app'
    );
  });

  it('returns empty for blank', () => {
    expect(normalizePublicAppUrl('')).toBe('');
    expect(normalizePublicAppUrl(null)).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { extractAppwriteFileId } from '../appwriteFileId.js';

describe('extractAppwriteFileId', () => {
  it('returns empty for blank input', () => {
    expect(extractAppwriteFileId('')).toBe('');
    expect(extractAppwriteFileId(null)).toBe('');
    expect(extractAppwriteFileId(undefined)).toBe('');
  });

  it('accepts a raw file id', () => {
    expect(extractAppwriteFileId('abc123XYZ')).toBe('abc123XYZ');
    expect(extractAppwriteFileId('file_01-doc.pdf')).toBe('file_01-doc.pdf');
  });

  it('extracts id from Appwrite storage view/download URLs', () => {
    const base =
      'https://cloud.appwrite.io/v1/storage/buckets/files/files/doc99/view?project=p1';
    expect(extractAppwriteFileId(base)).toBe('doc99');
    expect(
      extractAppwriteFileId(
        'https://cloud.appwrite.io/v1/storage/buckets/files/files/doc99/download'
      )
    ).toBe('doc99');
  });

  it('rejects paths that are not file ids', () => {
    expect(extractAppwriteFileId('https://example.com/other')).toBe('');
    expect(extractAppwriteFileId('/relative/path')).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildAttachmentRecord,
  isImageAttachment,
  reorderAttachments,
} from '../taskAttachmentsUpload.js';

describe('taskAttachmentsUpload helpers', () => {
  it('detecta anexos de imagem', () => {
    expect(isImageAttachment('image/png')).toBe(true);
    expect(isImageAttachment({ mimeType: 'image/jpeg' })).toBe(true);
    expect(isImageAttachment({ type: 'image' })).toBe(true);
    expect(isImageAttachment({ mimeType: 'application/pdf' })).toBe(false);
  });

  it('monta registro de anexo', () => {
    const rec = buildAttachmentRecord(
      { name: 'slide-1.png', type: 'image/png', size: 10 },
      'https://example.com/a.png',
      { uploadedBy: 'u1', uploadedByName: 'Ana' }
    );
    expect(rec).toMatchObject({
      name: 'slide-1.png',
      url: 'https://example.com/a.png',
      type: 'image',
      mimeType: 'image/png',
      uploadedBy: 'u1',
    });
    expect(rec.id).toMatch(/^att_/);
  });

  it('reordena anexos preservando no-op', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(reorderAttachments(list, 0, 0)).toBe(list);
    expect(reorderAttachments(list, 0, 2).map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(reorderAttachments(list, 2, 0).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});

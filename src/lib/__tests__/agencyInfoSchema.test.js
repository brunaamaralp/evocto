import { describe, expect, it } from 'vitest';
import {
  matchesSearchQuery,
  redactSecrets,
  toItemDto,
  validateItemWrite,
} from '../../../lib/server/agencyInfoSchema.js';

describe('agencyInfoSchema', () => {
  it('toItemDto normalizes booleans and omits undefined secrets', () => {
    const dto = toItemDto({
      id: 'i1',
      agencyId: 'ag1',
      type: 'note',
      title: 'Onboarding',
      category: 'processos',
      status: 'active',
      pinned: 'true',
      favorite: 0,
      body: 'Passo 1',
      tags: ['rh'],
      encryptedPassword: 'should-not-leak',
    });

    expect(dto.id).toBe('i1');
    expect(dto.pinned).toBe(true);
    expect(dto.favorite).toBe(false);
    expect(dto.tags).toEqual(['rh']);
    expect(dto.encryptedPassword).toBeUndefined();
    expect(JSON.stringify(dto)).not.toContain('should-not-leak');
  });

  it('validateItemWrite requires type and title on create', () => {
    const bad = validateItemWrite({});
    expect(bad.valid).toBe(false);
    expect(bad.errors.type).toBeTruthy();
    expect(bad.errors.title).toBeTruthy();
  });

  it('validateItemWrite accepts note without body', () => {
    const ok = validateItemWrite({
      type: 'note',
      title: 'Checklist interno',
      category: 'processos',
    });
    expect(ok.valid).toBe(true);
    expect(ok.value.type).toBe('note');
    expect(ok.value.status).toBe('active');
    expect(ok.value.pinned).toBe(false);
  });

  it('validateItemWrite requires externalUrl for link', () => {
    const missing = validateItemWrite({ type: 'link', title: 'Drive' });
    expect(missing.valid).toBe(false);
    expect(missing.errors.externalUrl).toBeTruthy();

    const badUrl = validateItemWrite({
      type: 'link',
      title: 'Drive',
      externalUrl: 'ftp://x',
    });
    expect(badUrl.valid).toBe(false);

    const ok = validateItemWrite({
      type: 'link',
      title: 'Drive',
      externalUrl: 'https://drive.google.com/file/x',
    });
    expect(ok.valid).toBe(true);
  });

  it('validateItemWrite requires file source for document', () => {
    const missing = validateItemWrite({ type: 'document', title: 'Contrato' });
    expect(missing.valid).toBe(false);
    expect(missing.errors.file).toBeTruthy();

    const ok = validateItemWrite({
      type: 'document',
      title: 'Contrato',
      fileId: 'file_1',
      fileUrl: 'https://example.com/f',
      fileName: 'contrato.pdf',
    });
    expect(ok.valid).toBe(true);
    expect(ok.value.fileId).toBe('file_1');
  });

  it('validateItemWrite partial update allows title-only', () => {
    const ok = validateItemWrite({ title: 'Novo título' }, { partial: true });
    expect(ok.valid).toBe(true);
    expect(ok.value.title).toBe('Novo título');
    expect(ok.value.type).toBeUndefined();
  });

  it('matchesSearchQuery checks title and category', () => {
    const item = { title: 'Manual de marca', category: 'processos' };
    expect(matchesSearchQuery(item, 'marca')).toBe(true);
    expect(matchesSearchQuery(item, 'process')).toBe(true);
    expect(matchesSearchQuery(item, 'financeiro')).toBe(false);
    expect(matchesSearchQuery(item, '')).toBe(true);
  });

  it('redactSecrets strips password fields', () => {
    const out = redactSecrets({
      title: 'x',
      password: 'secret',
      nested: { token: 't' },
    });
    expect(out.password).toBe('[redacted]');
    expect(out.nested.token).toBe('[redacted]');
    expect(out.title).toBe('x');
  });
});

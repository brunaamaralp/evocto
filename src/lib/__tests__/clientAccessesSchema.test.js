import { describe, expect, it } from 'vitest';
import {
  GENERAL_NOTES_FIELD,
  redactSecrets,
  toAccessDto,
  validateAccessWrite,
  validateGeneralNotes,
} from '../../../lib/server/clientAccessesSchema.js';

describe('clientAccessesSchema', () => {
  it('toAccessDto never exposes password or ciphertext', () => {
    const dto = toAccessDto({
      id: 'a1',
      agencyId: 'ag1',
      clientId: 'c1',
      platform: 'Instagram',
      url: 'https://instagram.com',
      username: 'brand',
      encryptedPassword: 'v1:iv:tag:cipher',
      notes: 'admin',
      password: 'should-not-leak',
    });

    expect(dto.id).toBe('a1');
    expect(dto.platform).toBe('Instagram');
    expect(dto.hasPassword).toBe(true);
    expect(dto.password).toBeUndefined();
    expect(dto.encryptedPassword).toBeUndefined();
    expect(JSON.stringify(dto)).not.toContain('v1:iv:tag:cipher');
    expect(JSON.stringify(dto)).not.toContain('should-not-leak');
  });

  it('toAccessDto marks hasPassword false when empty', () => {
    const dto = toAccessDto({
      id: 'a2',
      platform: 'Drive',
      encryptedPassword: '',
    });
    expect(dto.hasPassword).toBe(false);
  });

  it('validateAccessWrite requires platform and clientId', () => {
    const bad = validateAccessWrite({});
    expect(bad.valid).toBe(false);
    expect(bad.errors.platform).toBeTruthy();
    expect(bad.errors.clientId).toBeTruthy();

    const ok = validateAccessWrite({
      clientId: 'c1',
      platform: 'Meta Ads',
      username: 'ads@brand.com',
      password: 'secret',
    });
    expect(ok.valid).toBe(true);
    expect(ok.value.platform).toBe('Meta Ads');
    expect(ok.value.password).toBe('secret');
  });

  it('validateAccessWrite can require password on create', () => {
    const missing = validateAccessWrite(
      { clientId: 'c1', platform: 'WP' },
      { requirePassword: true }
    );
    expect(missing.valid).toBe(false);
    expect(missing.errors.password).toBeTruthy();
  });

  it('validateGeneralNotes accepts free text', () => {
    const bad = validateGeneralNotes({ generalNotes: 'oi' });
    expect(bad.valid).toBe(false);

    const ok = validateGeneralNotes({
      clientId: 'c1',
      generalNotes: 'Contato: João',
    });
    expect(ok.valid).toBe(true);
    expect(ok.value.generalNotes).toBe('Contato: João');
  });

  it('redactSecrets strips password fields recursively', () => {
    const redacted = redactSecrets({
      platform: 'IG',
      password: 'plain',
      nested: { encryptedPassword: 'cipher', ok: 1 },
    });
    expect(redacted.password).toBe('[redacted]');
    expect(redacted.nested.encryptedPassword).toBe('[redacted]');
    expect(redacted.nested.ok).toBe(1);
    expect(redacted.platform).toBe('IG');
  });

  it('uses stable general notes field name', () => {
    expect(GENERAL_NOTES_FIELD).toBe('acessos_info_geral');
  });
});

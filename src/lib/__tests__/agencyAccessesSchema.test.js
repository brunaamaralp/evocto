import { describe, expect, it } from 'vitest';
import {
  redactSecrets,
  toAgencyAccessDto,
  validateAgencyAccessWrite,
} from '../../../lib/server/agencyAccessesSchema.js';

describe('agencyAccessesSchema', () => {
  it('toAgencyAccessDto never leaks password or ciphertext', () => {
    const dto = toAgencyAccessDto({
      id: 'a1',
      agencyId: 'ag1',
      platform: 'Notion',
      url: 'https://notion.so',
      username: 'ops@agencia.com',
      notes: 'workspace interno',
      encryptedPassword: 'v1:iv:tag:cipher',
      password: 'should-not-appear',
    });

    expect(dto).toEqual({
      id: 'a1',
      agencyId: 'ag1',
      platform: 'Notion',
      url: 'https://notion.so',
      username: 'ops@agencia.com',
      notes: 'workspace interno',
      hasPassword: true,
      createdBy: null,
      created_date: null,
      updated_date: null,
    });
    expect(JSON.stringify(dto)).not.toContain('cipher');
    expect(JSON.stringify(dto)).not.toContain('should-not-appear');
    expect(dto.clientId).toBeUndefined();
  });

  it('validateAgencyAccessWrite requires platform', () => {
    const bad = validateAgencyAccessWrite({});
    expect(bad.valid).toBe(false);
    expect(bad.errors.platform).toBeTruthy();
  });

  it('validateAgencyAccessWrite accepts access without password', () => {
    const ok = validateAgencyAccessWrite({
      platform: 'Figma',
      url: 'https://figma.com',
      username: 'team@agencia.com',
    });
    expect(ok.valid).toBe(true);
    expect(ok.value.platform).toBe('Figma');
    expect(ok.value.password).toBe('');
    expect(ok.value.clearPassword).toBe(false);
  });

  it('validateAgencyAccessWrite can require password', () => {
    const bad = validateAgencyAccessWrite({ platform: 'X' }, { requirePassword: true });
    expect(bad.valid).toBe(false);
    expect(bad.errors.password).toBeTruthy();
  });

  it('redactSecrets strips password fields', () => {
    const out = redactSecrets({
      platform: 'Meta',
      password: 'secret',
      encryptedPassword: 'v1:x',
    });
    expect(out.password).toBe('[redacted]');
    expect(out.encryptedPassword).toBe('[redacted]');
    expect(out.platform).toBe('Meta');
  });
});

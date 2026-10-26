import { describe, expect, it } from 'vitest';
import { toPortalClientDto } from '../../../lib/server/clientPortalDto.js';
import { GENERAL_NOTES_FIELD } from '../../../lib/server/clientAccessesSchema.js';

describe('client accesses portal isolation', () => {
  it('toPortalClientDto omits general notes and any credential fields', () => {
    const dto = toPortalClientDto({
      id: 'c1',
      name: 'Cliente X',
      company: 'Empresa X',
      email: 'secret@client.com',
      [GENERAL_NOTES_FIELD]: 'Contato VIP e senha do Wi‑Fi: abc',
      password: 'should-not-appear',
      encryptedPassword: 'v1:x:y:z',
    });

    expect(dto).toEqual({
      id: 'c1',
      name: 'Cliente X',
      company: 'Empresa X',
    });
    expect(JSON.stringify(dto)).not.toContain('Contato VIP');
    expect(JSON.stringify(dto)).not.toContain('should-not-appear');
    expect(JSON.stringify(dto)).not.toContain('encryptedPassword');
  });
});

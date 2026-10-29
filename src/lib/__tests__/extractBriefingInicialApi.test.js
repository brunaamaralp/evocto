import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/appwrite', () => ({
  createSessionJwt: vi.fn(async () => 'test-jwt'),
}));

vi.mock('@/lib/authInterceptor', () => ({
  authedFetch: vi.fn(),
}));

import { authedFetch } from '@/lib/authInterceptor';
import { extractBriefingInicialFromFile } from '../extractBriefingInicialApi.js';

function makeFile(name, content = 'conteudo de briefing de teste com texto suficiente') {
  return new File([content], name, { type: 'text/plain' });
}

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (k) =>
        headers[String(k).toLowerCase()] ||
        (k.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

describe('extractBriefingInicialFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects HTML SPA fallthrough as api_unavailable', async () => {
    const htmlRes = {
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => '<!doctype html><html><body>app</body></html>',
    };
    // Tenta /api e depois /.netlify/functions — ambos HTML
    authedFetch.mockResolvedValue(htmlRes);

    await expect(
      extractBriefingInicialFromFile(makeFile('a.txt'))
    ).rejects.toMatchObject({ code: 'api_unavailable' });
    expect(authedFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to Netlify function path when /api is unavailable', async () => {
    const htmlRes = {
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => '<!doctype html><html></html>',
    };
    const payload = {
      sucesso: true,
      filled_keys: ['nome'],
      analise: { identidade: { nome_negocio: { valor: 'X', origem: 'extraido' } } },
      form: { empresa: { nome: 'X' } },
      empresa: { nome: 'X' },
    };
    authedFetch
      .mockResolvedValueOnce(htmlRes)
      .mockResolvedValueOnce(jsonResponse(200, payload));

    const result = await extractBriefingInicialFromFile(makeFile('a.txt'));
    expect(result.sucesso).toBe(true);
    expect(authedFetch.mock.calls[1][0]).toContain(
      '/.netlify/functions/extract-briefing-inicial'
    );
  });

  it('surfaces server message on 422', async () => {
    authedFetch.mockResolvedValue(
      jsonResponse(422, {
        error: 'no_fields_extracted',
        message: 'Lemos o arquivo, mas não encontramos base suficiente.',
      })
    );

    await expect(
      extractBriefingInicialFromFile(makeFile('a.txt'))
    ).rejects.toThrow(/base suficiente/i);
  });

  it('returns body on successful extract', async () => {
    const payload = {
      sucesso: true,
      filled_keys: ['nome', 'tom_brand'],
      analise: { identidade: { nome_negocio: { valor: 'X', origem: 'extraido' } } },
      form: { empresa: { nome: 'X', tom_brand: 'Direto' } },
      empresa: { nome: 'X', tom_brand: 'Direto' },
    };
    authedFetch.mockResolvedValue(jsonResponse(200, payload));

    const result = await extractBriefingInicialFromFile(makeFile('a.txt'));
    expect(result.sucesso).toBe(true);
    expect(result.filled_keys).toContain('nome');
  });
});

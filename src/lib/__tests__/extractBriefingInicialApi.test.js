import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/api/appwriteClient', () => ({
  getAccount: () => ({
    createJWT: vi.fn(async () => ({ jwt: 'test-jwt' })),
  }),
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
    authedFetch.mockResolvedValue(htmlRes);

    await expect(
      extractBriefingInicialFromFile(makeFile('a.txt'), { stream: false })
    ).rejects.toMatchObject({ code: 'api_unavailable' });
    expect(authedFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to /api when functions path is unavailable', async () => {
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

    const result = await extractBriefingInicialFromFile(makeFile('a.txt'), { stream: false });
    expect(result.sucesso).toBe(true);
    expect(authedFetch.mock.calls[0][0]).toContain(
      '/.netlify/functions/extract-briefing-inicial'
    );
    expect(authedFetch.mock.calls[1][0]).toContain(
      '/api/extract-briefing-inicial'
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
      extractBriefingInicialFromFile(makeFile('a.txt'), { stream: false })
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

    const result = await extractBriefingInicialFromFile(makeFile('a.txt'), { stream: false });
    expect(result.sucesso).toBe(true);
    expect(result.filled_keys).toContain('nome');
  });

  describe('streaming (edge function)', () => {
    const aiJson = JSON.stringify({
      analise: {
        identidade: {
          nome_negocio: { valor: 'Padaria Sol', origem: 'extraido' },
          tom_voz: { valor: 'Acolhedor', origem: 'extraido' },
        },
        frentes_receita: [
          {
            nome: 'Pães artesanais',
            objetivo: { valor: 'Vender pães', origem: 'extraido' },
            publico_principal: { valor: 'Famílias do bairro', origem: 'extraido' },
          },
        ],
      },
      empresa: { nome: 'Padaria Sol' },
      avisos: ['sem orçamento'],
    });

    function ndjsonResponse(lines) {
      const enc = new TextEncoder();
      const body = lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
      // corta em pedaços arbitrários para exercitar o buffer
      const chunks = [body.slice(0, 7), body.slice(7, 50), body.slice(50)];
      let i = 0;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/x-ndjson; charset=utf-8' },
        body: {
          getReader: () => ({
            read: async () =>
              i < chunks.length
                ? { value: enc.encode(chunks[i++]), done: false }
                : { value: undefined, done: true },
          }),
        },
      };
    }

    it('assembles streamed deltas into the extract result', async () => {
      authedFetch.mockResolvedValue(
        ndjsonResponse([
          { t: 'delta', v: aiJson.slice(0, 30) },
          { t: 'delta', v: aiJson.slice(30) },
          { t: 'done', stop_reason: 'end_turn', usage: { output_tokens: 10 }, model: 'm' },
        ])
      );
      const result = await extractBriefingInicialFromFile(makeFile('a.txt'));
      expect(authedFetch).toHaveBeenCalledTimes(1);
      expect(authedFetch.mock.calls[0][0]).toBe('/api/extract-briefing-stream');
      const sent = JSON.parse(authedFetch.mock.calls[0][1].body);
      expect(sent.text).toMatch(/briefing de teste/);
      expect(result.sucesso).toBe(true);
      expect(result.empresa.nome).toBe('Padaria Sol');
      expect(result.filled_keys).toContain('tom_brand');
      expect(result.avisos).toEqual(['sem orçamento']);
    });

    it('surfaces stream error events', async () => {
      authedFetch.mockResolvedValue(
        ndjsonResponse([
          { t: 'error', error: 'anthropic_overloaded', message: 'O serviço de IA está sobrecarregado agora.' },
        ])
      );
      await expect(
        extractBriefingInicialFromFile(makeFile('a.txt'))
      ).rejects.toThrow(/sobrecarregado/);
    });

    it('reports truncated output clearly', async () => {
      authedFetch.mockResolvedValue(
        ndjsonResponse([
          { t: 'delta', v: aiJson.slice(0, 40) },
          { t: 'done', stop_reason: 'max_tokens', usage: {}, model: 'm' },
        ])
      );
      await expect(
        extractBriefingInicialFromFile(makeFile('a.txt'))
      ).rejects.toThrow(/cortada/);
    });

    it('falls back to the legacy function when the edge endpoint is missing', async () => {
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

    it('passes server JSON errors through without falling back', async () => {
      authedFetch.mockResolvedValue(
        jsonResponse(401, { error: 'invalid_session', message: 'Sessão expirada ou inválida. Faça login.' })
      );
      await expect(
        extractBriefingInicialFromFile(makeFile('a.txt'))
      ).rejects.toThrow(/Sessão expirada/);
      expect(authedFetch).toHaveBeenCalledTimes(1);
    });
  });
});

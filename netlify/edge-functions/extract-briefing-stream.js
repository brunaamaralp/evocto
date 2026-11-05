/**
 * Netlify Edge Function — extract-briefing-stream
 *
 * POST /api/extract-briefing-stream
 * Body: { filename, clientName?, text?, pdfBase64? }
 * Auth: Bearer JWT Appwrite
 *
 * Por que Edge e não Function Node: Functions síncronas da Netlify são cortadas
 * em 10s (26s só se o suporte liberar). A resposta do Claude para o briefing
 * completo leva mais que isso. Edge Functions não têm limite de tempo de parede
 * enquanto a resposta está sendo transmitida, então repassamos o stream.
 *
 * Resposta: NDJSON (uma linha JSON por evento)
 *   {"t":"delta","v":"..."}               trecho de texto gerado
 *   {"t":"done","stop_reason":"...","usage":{...},"model":"..."}
 *   {"t":"error","error":"code","message":"..."}
 * Erros antes do stream (auth/payload) voltam como JSON com status HTTP.
 */
import {
  EXTRACT_BRIEFING_INICIAL_SYSTEM_PROMPT,
  buildExtractBriefingInicialUserPrompt,
} from '../../src/lib/extractBriefingInicialPrompt.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const RETIRED_MODELS = new Set([
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
]);
const MIN_TEXT_CHARS = 40;
const MAX_TEXT_CHARS = 120_000;
const MAX_PDF_BASE64 = Math.ceil((3.5 * 1024 * 1024 * 4) / 3) + 1024;

function env(name) {
  try {
    return globalThis.Netlify?.env?.get(name) || '';
  } catch {
    return '';
  }
}

function resolveModel() {
  const id = String(
    env('ANTHROPIC_BRIEFING_MODEL') || env('ANTHROPIC_MODEL') || DEFAULT_MODEL
  ).trim();
  return !id || RETIRED_MODELS.has(id) ? DEFAULT_MODEL : id;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function verifyAppwriteJwt(request) {
  const header = request.headers.get('authorization') || '';
  const jwt = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!jwt) return { ok: false, status: 401, error: 'unauthorized' };

  const endpoint = (
    env('VITE_APPWRITE_ENDPOINT') || env('APPWRITE_ENDPOINT')
  ).replace(/\/+$/, '');
  const projectId = env('VITE_APPWRITE_PROJECT_ID') || env('APPWRITE_PROJECT_ID');
  if (!endpoint || !projectId) {
    return { ok: false, status: 500, error: 'appwrite_not_configured' };
  }

  const res = await fetch(`${endpoint}/account`, {
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-JWT': jwt,
    },
  }).catch(() => null);
  if (!res || !res.ok) {
    return { ok: false, status: 401, error: 'invalid_session' };
  }
  return { ok: true };
}

function friendlyAnthropicError(status, data) {
  const raw = data?.error?.message || `anthropic_http_${status}`;
  const msg = typeof raw === 'string' ? raw : 'anthropic_error';
  const modelMissing =
    status === 404 ||
    data?.error?.type === 'not_found_error' ||
    /^model:\s*claude-/i.test(msg);
  if (modelMissing) {
    return {
      error: 'anthropic_model_unavailable',
      message:
        'Modelo de IA indisponível no servidor. Ajuste a variável ANTHROPIC_BRIEFING_MODEL.',
    };
  }
  if (status === 401 || status === 403) {
    return {
      error: 'anthropic_auth_failed',
      message: 'A chave de IA (ANTHROPIC_API_KEY) foi recusada. Peça ao admin para revisá-la.',
    };
  }
  if (status === 429 || status === 529) {
    return {
      error: 'anthropic_overloaded',
      message: 'O serviço de IA está sobrecarregado. Tente novamente em instantes.',
    };
  }
  return { error: 'ia_failed', message: msg.slice(0, 300) };
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const auth = await verifyAppwriteJwt(request);
  if (!auth.ok) {
    return json(auth.status, {
      error: auth.error,
      message:
        auth.status === 401
          ? 'Sessão expirada ou inválida. Faça login novamente.'
          : 'Servidor sem configuração do Appwrite.',
    });
  }

  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return json(503, {
      error: 'anthropic_not_configured',
      message:
        'A chave de IA (ANTHROPIC_API_KEY) não está configurada no servidor. Peça ao admin para configurar.',
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'invalid_json', message: 'Requisição inválida.' });
  }

  const filename = String(body?.filename || '').slice(0, 200);
  const clientName = String(body?.clientName || '').slice(0, 200);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const pdfBase64 =
    typeof body?.pdfBase64 === 'string' ? body.pdfBase64.replace(/\s/g, '') : '';

  let userContent;
  if (text) {
    if (text.length < MIN_TEXT_CHARS) {
      return json(422, {
        error: 'empty_document',
        message: 'O documento está vazio ou muito curto para extrair um briefing.',
      });
    }
    userContent = buildExtractBriefingInicialUserPrompt({
      filename,
      clientName,
      textExcerpt: text.slice(0, MAX_TEXT_CHARS),
    });
  } else if (pdfBase64) {
    if (pdfBase64.length > MAX_PDF_BASE64) {
      return json(413, {
        error: 'file_too_large',
        message: 'Arquivo muito grande (máx. 3 MB).',
      });
    }
    userContent = [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
      },
      {
        type: 'text',
        text: buildExtractBriefingInicialUserPrompt({ filename, clientName }),
      },
    ];
  } else {
    return json(400, {
      error: 'invalid_payload',
      message: 'O arquivo não chegou ao servidor. Tente novamente.',
    });
  }

  const model = resolveModel();
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.2,
      stream: true,
      system: EXTRACT_BRIEFING_INICIAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  }).catch((err) => ({ ok: false, status: 502, _err: err }));

  if (!upstream.ok || !upstream.body) {
    const data = upstream.json ? await upstream.json().catch(() => ({})) : {};
    const status = upstream.status || 502;
    const mapped = friendlyAnthropicError(status, data);
    console.error('[extract-briefing-stream] anthropic', status, data?.error || upstream._err);
    return json(status >= 500 || status === 429 ? 502 : 503, mapped);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  const usage = { input_tokens: 0, output_tokens: 0 };
  let stopReason = null;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      let buffer = '';
      let failed = false;

      const handleEvent = (raw) => {
        const dataLine = raw
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim())
          .join('');
        if (!dataLine) return;
        let evt;
        try {
          evt = JSON.parse(dataLine);
        } catch {
          return;
        }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          emit({ t: 'delta', v: evt.delta.text });
        } else if (evt.type === 'message_start') {
          usage.input_tokens = Number(evt.message?.usage?.input_tokens || 0);
        } else if (evt.type === 'message_delta') {
          stopReason = evt.delta?.stop_reason || stopReason;
          usage.output_tokens = Number(evt.usage?.output_tokens || usage.output_tokens);
        } else if (evt.type === 'error') {
          failed = true;
          const mapped = friendlyAnthropicError(
            evt.error?.type === 'overloaded_error' ? 529 : 500,
            evt
          );
          emit({ t: 'error', ...mapped });
        }
      };

      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n\n')) >= 0) {
            handleEvent(buffer.slice(0, idx));
            buffer = buffer.slice(idx + 2);
          }
        }
        if (buffer.trim()) handleEvent(buffer);
        if (!failed) emit({ t: 'done', stop_reason: stopReason, usage, model });
      } catch (err) {
        console.error('[extract-briefing-stream] stream', err);
        emit({
          t: 'error',
          error: 'ia_failed',
          message: 'A conexão com a IA caiu durante a leitura. Tente novamente.',
        });
      } finally {
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const config = {
  path: '/api/extract-briefing-stream',
  method: ['POST', 'OPTIONS'],
};

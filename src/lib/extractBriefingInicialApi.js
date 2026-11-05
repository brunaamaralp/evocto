import { getAccount } from '@/api/appwriteClient';
import { authedFetch } from '@/lib/authInterceptor';
import { friendlyError } from '@/lib/errorMessages';
import {
  EXTRACT_BRIEFING_MAX_BYTES,
  buildExtractBriefingResult,
  resolveExtractBriefingFileMeta,
} from '@/lib/extractBriefingInicialSchema';

const STREAM_ENDPOINT = '/api/extract-briefing-stream';
/** O stream não tem limite de 10s da Netlify; damos folga para PDFs grandes. */
const STREAM_TIMEOUT_MS = 180_000;
const MIN_PDF_TEXT_CHARS = 80;

/** Cliente aborta um pouco após o timeout da function Netlify (26s). */
const CLIENT_TIMEOUT_MS = 55_000;

async function createJwtForExtract() {
  try {
    const res = await Promise.race([
      getAccount().createJWT(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('jwt_timeout')), 10000);
      }),
    ]);
    return res?.jwt || '';
  } catch (err) {
    const code =
      String(err?.message || '').includes('jwt_timeout')
        ? 'session_required'
        : 'session_required';
    const e = new Error(
      code === 'session_required'
        ? 'Sessão expirada ou JWT indisponível. Faça login novamente.'
        : String(err?.message || err)
    );
    e.code = 'session_required';
    e.cause = err;
    throw e;
  }
}

async function authHeaders(extra = {}) {
  const jwt = await createJwtForExtract();
  if (!jwt) {
    const err = new Error(
      'Sessão expirada ou JWT indisponível. Faça login novamente.'
    );
    err.code = 'session_required';
    throw err;
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
    ...extra,
  };
}

function isHumanMessage(msg) {
  const s = String(msg || '').trim();
  return s.length > 12 && /\s/.test(s) && !/^[a-z0-9_.-]+$/i.test(s);
}

function throwExtractError({
  code = 'ia_failed',
  message,
  status = 0,
  body = null,
}) {
  const preferred =
    (isHumanMessage(message) && String(message).trim()) ||
    (isHumanMessage(body?.message) && String(body.message).trim()) ||
    friendlyError(code || message || body || 'ia_failed', 'action');
  const err = new Error(preferred);
  err.code = code;
  err.status = status;
  err.body = body;
  throw err;
}

async function parseRes(res) {
  const ct = String(res.headers.get('content-type') || '').toLowerCase();
  const rawText = await res.text().catch(() => '');

  let body = {};
  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch {
      body = {};
    }
  }

  // SPA fallthrough / HTML de erro Netlify → não tratar como sucesso silencioso
  const looksLikeHtml =
    !ct.includes('application/json') &&
    (/^\s*</.test(rawText) || /<!doctype html/i.test(rawText));

  if (looksLikeHtml || (res.ok && !body?.sucesso && !body?.form && !body?.analise && !body?.error)) {
    throwExtractError({
      code: 'api_unavailable',
      message: 'api_unavailable',
      status: res.status || 502,
      body: { error: 'api_unavailable', raw: rawText.slice(0, 200) },
    });
  }

  if (!res.ok) {
    const code = body?.error || body?.errorType || `error_${res.status}`;
    const message =
      (typeof body?.message === 'string' && body.message.trim()) ||
      (typeof body?.errorMessage === 'string' && body.errorMessage.trim()) ||
      code;
    // Crash de bootstrap da Function (ex.: import.meta.env) → mensagem clara
    if (/import\.meta\.env|VITE_APPWRITE/i.test(String(message))) {
      throwExtractError({
        code: 'api_unavailable',
        message:
          'O serviço de importação está instável neste deploy. Aguarde o próximo deploy ou tente de novo em instantes.',
        status: res.status,
        body,
      });
    }
    throwExtractError({
      code,
      message,
      status: res.status,
      body,
    });
  }

  const filledKeys = Array.isArray(body.filled_keys) ? body.filled_keys : [];
  const hasAnalise = Boolean(
    body.analise?.identidade || body.analise?.frentes_receita
  );
  const hasEmpresa = Boolean(
    body.empresa?.nome ||
      body.form?.empresa?.nome ||
      filledKeys.length > 0
  );

  if (!hasAnalise && !hasEmpresa) {
    throwExtractError({
      code: 'no_fields_extracted',
      message: 'no_fields_extracted',
      status: 422,
      body,
    });
  }

  return body;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => {
      const err = new Error('file_read_failed');
      err.code = 'file_read_failed';
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

async function extractTextInBrowser(file, kind) {
  if (kind === 'txt') {
    let text = await file.text();
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return { text: text.trim(), mode: 'text' };
  }
  if (kind === 'docx') {
    const mod = await import('mammoth');
    const mammoth = mod.default || mod;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: String(result?.value || '').trim(), mode: 'docx_text' };
  }
  // PDF: texto embutido primeiro; se não houver (PDF escaneado), envia o PDF.
  try {
    const { extractText } = await import('unpdf');
    const result = await extractText(new Uint8Array(await file.arrayBuffer()), {
      mergePages: true,
    });
    const text = Array.isArray(result?.text)
      ? result.text.join('\n')
      : String(result?.text ?? result ?? '');
    if (text.trim().length >= MIN_PDF_TEXT_CHARS) {
      return { text: text.trim(), mode: 'pdf_text' };
    }
  } catch (err) {
    console.warn('[BriefingImport] leitura local do PDF falhou:', err?.message || err);
  }
  return { text: '', mode: 'pdf_document' };
}

/**
 * Lê o NDJSON da Edge Function e devolve o texto completo da IA.
 * Lança { code: 'api_unavailable' } se o endpoint não existir neste deploy.
 */
async function streamExtract({ url, headers, payload, signal, onProgress }) {
  const res = await authedFetch(url, { method: 'POST', headers, body: payload, signal });
  const ct = String(res.headers.get('content-type') || '').toLowerCase();

  if (!ct.includes('ndjson')) {
    // Erro JSON antes do stream, ou HTML/404 (Edge Function ausente neste deploy).
    const rawText = await res.text().catch(() => '');
    let body = {};
    try {
      body = JSON.parse(rawText);
    } catch {
      body = {};
    }
    if (
      !ct.includes('application/json') ||
      res.ok ||
      res.status === 404 ||
      res.status === 405
    ) {
      throwExtractError({
        code: 'api_unavailable',
        message: 'api_unavailable',
        status: res.status || 502,
        body: { error: 'api_unavailable', raw: rawText.slice(0, 200) },
      });
    }
    throwExtractError({
      code: body?.error || `error_${res.status}`,
      message: body?.message || body?.error || `error_${res.status}`,
      status: res.status,
      body,
    });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let aiText = '';
  let done = null;

  const handleLine = (line) => {
    if (!line.trim()) return;
    let evt;
    try {
      evt = JSON.parse(line);
    } catch {
      return;
    }
    if (evt.t === 'delta') {
      aiText += evt.v || '';
      onProgress?.(aiText.length);
    } else if (evt.t === 'done') {
      done = evt;
    } else if (evt.t === 'error') {
      throwExtractError({
        code: evt.error || 'ia_failed',
        message: evt.message || evt.error || 'ia_failed',
        status: 502,
        body: evt,
      });
    }
  };

  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
    }
  }
  handleLine(buffer);

  if (!done) {
    throwExtractError({
      code: 'ia_failed',
      message: 'A resposta da IA foi interrompida. Tente novamente.',
      status: 502,
    });
  }
  return { aiText, done };
}

/**
 * Valida e envia o arquivo para extração no servidor.
 * @param {File} file
 * @param {{ clientName?: string, signal?: AbortSignal }} [opts]
 */
export async function extractBriefingInicialFromFile(file, opts = {}) {
  if (!file) {
    throwExtractError({
      code: 'unsupported_file_type',
      message: 'unsupported_file_type',
    });
  }

  const meta = resolveExtractBriefingFileMeta({
    filename: file.name,
    mimeType: file.type,
  });
  if (!meta.ok) {
    throwExtractError({
      code: meta.error || 'unsupported_file_type',
      message: meta.message || 'unsupported_file_type',
    });
  }

  if (file.size > EXTRACT_BRIEFING_MAX_BYTES) {
    const mb = Math.floor(EXTRACT_BRIEFING_MAX_BYTES / (1024 * 1024));
    throwExtractError({
      code: 'file_too_large',
      message: `Arquivo muito grande (máx. ${mb} MB).`,
    });
  }

  // Caminho principal: Edge Function em streaming (sem o corte de 10s).
  if (opts.stream !== false) {
    try {
      return await extractViaStream(file, meta, opts);
    } catch (err) {
      if (err?.code !== 'api_unavailable') throw err;
      opts.onStage?.('Streaming indisponível neste deploy; usando endpoint antigo…');
    }
  }
  return extractViaLegacyFunction(file, meta, opts);
}

async function extractViaStream(file, meta, opts) {
  opts.onStage?.('Lendo o arquivo no navegador…');
  let local;
  try {
    local = await extractTextInBrowser(file, meta.kind);
  } catch (err) {
    console.warn('[BriefingImport] leitura local falhou:', err?.message || err);
    throwExtractError({
      code: 'file_read_failed',
      message:
        meta.kind === 'docx'
          ? 'Não foi possível ler este DOCX. Salve novamente ou envie em PDF/TXT.'
          : 'Não foi possível ler o arquivo. Tente outro formato.',
    });
  }

  if (local.mode !== 'pdf_document' && local.text.length < 40) {
    throwExtractError({
      code: 'empty_document',
      message:
        'O documento está vazio ou muito curto para extrair um briefing.',
      status: 422,
    });
  }

  const payload = JSON.stringify({
    filename: file.name,
    clientName: opts.clientName || '',
    ...(local.mode === 'pdf_document'
      ? { pdfBase64: await readFileAsBase64(file) }
      : { text: local.text }),
  });
  const headers = await authHeaders();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    opts.onStage?.('Enviando para a IA…');
    const { aiText, done } = await streamExtract({
      url: STREAM_ENDPOINT,
      headers,
      payload,
      signal: controller.signal,
      onProgress: opts.onProgress,
    });
    const { status, body } = buildExtractBriefingResult(aiText, {
      clientName: opts.clientName || '',
      model: done.model || '',
      usage: done.usage || {},
      stopReason: done.stop_reason,
      source: {
        filename: file.name,
        mimeType: meta.mime,
        kind: meta.kind,
        mode: local.mode,
        text_chars: local.text.length || null,
      },
    });
    if (status !== 200) {
      throwExtractError({ code: body.error, message: body.message, status, body });
    }
    return body;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throwExtractError({ code: 'claude_timeout', message: 'claude_timeout' });
    }
    if (err?.code) throw err;
    const raw = String(err?.message || err || '');
    if (/Failed to fetch|NetworkError|fetch failed|network/i.test(raw)) {
      throwExtractError({ code: 'Failed to fetch', message: 'Failed to fetch' });
    }
    throwExtractError({ code: 'ia_failed', message: raw || 'ia_failed' });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function extractViaLegacyFunction(file, meta, opts) {
  const contentBase64 = await readFileAsBase64(file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else {
      opts.signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  const payload = JSON.stringify({
    filename: file.name,
    mimeType: meta.mime,
    contentBase64,
    clientName: opts.clientName || '',
  });
  const headers = await authHeaders();

  // Neste host o rewrite /api/* costuma 404; Function direta primeiro.
  const endpoints = [
    '/.netlify/functions/extract-briefing-inicial',
    '/api/extract-briefing-inicial',
  ];

  try {
    let lastErr = null;
    for (const url of endpoints) {
      try {
        const res = await authedFetch(url, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: payload,
        });
        return await parseRes(res);
      } catch (err) {
        lastErr = err;
        if (err?.code === 'api_unavailable' || err?.status === 404) {
          continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error('api_unavailable');
  } catch (err) {
    if (err?.name === 'AbortError' || err?.code === 'AbortError') {
      throwExtractError({
        code: 'claude_timeout',
        message: 'claude_timeout',
      });
    }
    if (err?.code && err?.body !== undefined) throw err;
    if (err?.code === 'session_required' || err?.message === 'session_required') {
      throwExtractError({ code: 'session_required', message: 'session_required' });
    }
    const raw = String(err?.message || err || '');
    if (/Failed to fetch|NetworkError|fetch failed/i.test(raw)) {
      throwExtractError({ code: 'Failed to fetch', message: 'Failed to fetch' });
    }
    throwExtractError({
      code: err?.code || 'ia_failed',
      message: raw || 'ia_failed',
      body: err?.body || null,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const EXTRACT_BRIEFING_ACCEPT =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

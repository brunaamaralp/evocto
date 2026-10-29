import { getAccount } from '@/api/appwriteClient';
import { authedFetch } from '@/lib/authInterceptor';
import { friendlyError } from '@/lib/errorMessages';
import {
  EXTRACT_BRIEFING_MAX_BYTES,
  resolveExtractBriefingFileMeta,
} from '@/lib/extractBriefingInicialSchema';

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

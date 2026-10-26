import { createSessionJwt } from '@/lib/appwrite';
import { authedFetch } from '@/lib/authInterceptor';
import { friendlyError } from '@/lib/errorMessages';
import {
  EXTRACT_BRIEFING_MAX_BYTES,
  resolveExtractBriefingFileMeta,
} from '@/lib/extractBriefingInicialSchema';

async function authHeaders(extra = {}) {
  const jwt = await createSessionJwt();
  if (!jwt) throw new Error('session_required');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
    ...extra,
  };
}

async function parseRes(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(friendlyError(body, 'action'));
    err.code = body.error;
    err.status = res.status;
    err.body = body;
    throw err;
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
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Valida e envia o arquivo para extração no servidor.
 * @param {File} file
 * @param {{ clientName?: string }} [opts]
 */
export async function extractBriefingInicialFromFile(file, opts = {}) {
  if (!file) {
    const err = new Error('Selecione um arquivo PDF, DOCX ou TXT.');
    err.code = 'unsupported_file_type';
    throw err;
  }

  const meta = resolveExtractBriefingFileMeta({
    filename: file.name,
    mimeType: file.type,
  });
  if (!meta.ok) {
    const err = new Error(meta.message);
    err.code = meta.error;
    throw err;
  }

  if (file.size > EXTRACT_BRIEFING_MAX_BYTES) {
    const mb = Math.floor(EXTRACT_BRIEFING_MAX_BYTES / (1024 * 1024));
    const err = new Error(`Arquivo muito grande (máx. ${mb} MB).`);
    err.code = 'file_too_large';
    throw err;
  }

  const contentBase64 = await readFileAsBase64(file);
  const res = await authedFetch('/api/extract-briefing-inicial', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      filename: file.name,
      mimeType: meta.mime,
      contentBase64,
      clientName: opts.clientName || '',
    }),
  });
  return parseRes(res);
}

export const EXTRACT_BRIEFING_ACCEPT =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

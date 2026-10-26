import { createSessionJwt } from '@/lib/appwrite';
import { authedFetch } from '@/lib/authInterceptor';
import { friendlyError } from '@/lib/errorMessages';

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

/**
 * @param {{
 *   agencyId: string,
 *   clientId: string,
 *   tipo: 'proposta'|'apresentacao',
 *   leadId?: string,
 *   titulo?: string,
 *   objetivo?: string,
 *   tom?: string,
 *   escopo?: string,
 *   investimento?: string,
 *   prazo?: string,
 *   agencyName?: string,
 * }} payload
 */
export async function createGenerateMaterialJob(payload) {
  const res = await authedFetch('/api/generate-material?route=create', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

export async function getGenerateMaterialJobStatus(jobId) {
  const params = new URLSearchParams({ route: 'status', jobId: String(jobId) });
  const res = await authedFetch(`/api/generate-material?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

/**
 * Poll até ready|failed ou timeout.
 * @returns {Promise<object>} job
 */
export async function pollGenerateMaterialJob(
  jobId,
  { intervalMs = 4000, timeoutMs = 5 * 60 * 1000, onTick } = {}
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { job } = await getGenerateMaterialJobStatus(jobId);
    if (typeof onTick === 'function') onTick(job);
    if (job?.status === 'ready' || job?.status === 'failed') return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  const err = new Error('A geração demorou demais. Tente novamente.');
  err.code = 'claude_timeout';
  throw err;
}

/**
 * @param {string} clientId
 * @param {{
 *   tipo?: string,
 *   leadId?: string,
 *   investimento?: string,
 *   titulo?: string,
 *   objetivo?: string,
 *   escopo?: string,
 * }} [opts]
 */
export function buildGerarMaterialHref(clientId, opts = {}) {
  const id = String(clientId || '').trim();
  if (!id) return 'gerar-material';
  const params = new URLSearchParams();
  params.set('clientId', id);
  if (opts.tipo) params.set('tipo', String(opts.tipo));
  if (opts.leadId) params.set('leadId', String(opts.leadId));
  if (opts.investimento) params.set('investimento', String(opts.investimento));
  if (opts.titulo) params.set('titulo', String(opts.titulo));
  if (opts.objetivo) params.set('objetivo', String(opts.objetivo));
  if (opts.escopo) params.set('escopo', String(opts.escopo));
  return `gerar-material?${params.toString()}`;
}

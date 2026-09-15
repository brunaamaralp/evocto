/**
 * PI-4 — Planejar Múltiplos (3–5 meses em batch).
 * Spec: docs/SPEC_PLANEJAMENTO_ITERATIVO.md
 */

import {
  BRIEF_KIND_CAMPANHA_MENSAL,
  UX_KIND_CAMPANHA,
  briefPatchFromIdeia,
} from '@/lib/campanhaIdeia';

export const MULTIPLOS_MIN = 3;
export const MULTIPLOS_MAX = 5;

/**
 * @returns {string}
 */
export function createBatchId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Meses vazios elegíveis no Panorama.
 * @param {Array<{ mes: number, status: string, label?: string }>} months
 */
export function listEligibleEmptyMonths(months = []) {
  return (Array.isArray(months) ? months : []).filter((m) => m?.status === 'empty');
}

/**
 * @param {number[]} selectedMeses
 * @param {{ min?: number, max?: number }} [opts]
 */
export function validateMultiplosSelection(
  selectedMeses = [],
  { min = MULTIPLOS_MIN, max = MULTIPLOS_MAX } = {}
) {
  const unique = [...new Set(
    (Array.isArray(selectedMeses) ? selectedMeses : [])
      .map((m) => Number(m))
      .filter((m) => m >= 1 && m <= 12)
  )].sort((a, b) => a - b);

  if (unique.length < min) {
    return {
      valid: false,
      meses: unique,
      error: `Selecione pelo menos ${min} meses`,
    };
  }
  if (unique.length > max) {
    return {
      valid: false,
      meses: unique,
      error: `Selecione no máximo ${max} meses`,
    };
  }
  return { valid: true, meses: unique, error: null };
}

/**
 * Valida rascunhos do canvas (título obrigatório por mês).
 * @param {Array<{ mes: number, titulo?: string, conceito?: string, ciclo?: string }>} drafts
 */
export function validateMultiplosDrafts(drafts = []) {
  const list = Array.isArray(drafts) ? drafts : [];
  const errors = {};
  for (const d of list) {
    if (!String(d?.titulo || '').trim()) {
      errors[d.mes] = 'Título obrigatório';
    }
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Payload leve de campanha “planejada” (sem launch de ciclo/tarefas).
 * @param {{
 *   agencyId: string,
 *   clientId: string,
 *   mes: number,
 *   ano: number,
 *   linkedToBatch: string,
 *   titulo?: string,
 *   conceito?: string,
 *   mecanismo?: string,
 *   foco?: string,
 *   ciclo?: string,
 *   userId?: string|null,
 *   serviceId?: string|null,
 * }} args
 */
export function buildPlanejadoBatchPayload({
  agencyId,
  clientId,
  mes,
  ano,
  linkedToBatch,
  titulo = '',
  conceito = '',
  mecanismo = '',
  foco = '',
  ciclo = '',
  userId = null,
  serviceId = null,
}) {
  const ideiaPatch = briefPatchFromIdeia({
    titulo,
    conceito,
    mecanismo,
    foco,
    ciclo,
  });
  const now = new Date().toISOString();
  const mesNum = Number(mes);
  const anoNum = Number(ano);
  const start = `${anoNum}-${String(mesNum).padStart(2, '0')}-01`;

  return {
    agencyId,
    clientId,
    projectId: clientId,
    serviceId: serviceId || null,
    ...ideiaPatch,
    brief_kind: BRIEF_KIND_CAMPANHA_MENSAL,
    ux_kind: UX_KIND_CAMPANHA,
    modo_criacao: 'planejar_multiplos',
    origem: 'planejar_multiplos',
    status_campanha: 'planejada',
    status: 'READY',
    mes: mesNum,
    ano: anoNum,
    linkedToBatch: String(linkedToBatch || '').trim() || null,
    data_gravacao_inicio: start,
    data_gravacao_fim: start,
    tipo_campanha: '5_videos',
    criado_por: userId || null,
    criado_em: now,
    editado_em: now,
    historico: [
      {
        data: now,
        usuario: userId,
        acao: 'create_batch',
        campo: 'linkedToBatch',
        antes: null,
        depois: linkedToBatch,
      },
    ],
  };
}

/**
 * Cria N briefs do batch (sequencial para falhas claras).
 * @param {{
 *   agencyId: string,
 *   clientId: string,
 *   ano: number,
 *   drafts: Array<{ mes: number, titulo?: string, conceito?: string, mecanismo?: string, foco?: string, ciclo?: string }>,
 *   userId?: string|null,
 *   serviceId?: string|null,
 *   linkedToBatch?: string|null,
 *   createFn?: (payload: object) => Promise<object>,
 * }} args
 */
export async function savePlanejarMultiplosBatch({
  agencyId,
  clientId,
  ano,
  drafts,
  userId = null,
  serviceId = null,
  linkedToBatch = null,
  createFn = null,
} = {}) {
  if (!agencyId) throw new Error('agencyId obrigatório');
  if (!clientId) throw new Error('clientId obrigatório');

  const selection = validateMultiplosSelection(
    (drafts || []).map((d) => d.mes)
  );
  if (!selection.valid) {
    const err = new Error(selection.error);
    err.code = 'selection';
    throw err;
  }

  const draftCheck = validateMultiplosDrafts(drafts);
  if (!draftCheck.valid) {
    const err = new Error('Preencha o título de cada mês');
    err.code = 'drafts';
    err.errors = draftCheck.errors;
    throw err;
  }

  const batchId = linkedToBatch || createBatchId();
  const create =
    createFn ||
    (async (payload) => {
      const { Brief } = await import('@/api/entities');
      return Brief.create(payload);
    });
  const created = [];

  for (const draft of drafts) {
    const payload = buildPlanejadoBatchPayload({
      agencyId,
      clientId,
      mes: draft.mes,
      ano,
      linkedToBatch: batchId,
      titulo: draft.titulo,
      conceito: draft.conceito,
      mecanismo: draft.mecanismo,
      foco: draft.foco,
      ciclo: draft.ciclo,
      userId,
      serviceId,
    });
    const brief = await create(payload);
    created.push(brief);
  }

  return { linkedToBatch: batchId, created };
}

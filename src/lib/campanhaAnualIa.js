import { Brief } from '@/api/entities';
import { createSessionJwt } from '@/lib/appwrite';
import {
  applyGeracaoIaToAnual,
  buildInputIaFromAnual,
  normalizeCampanhaAnualPayload,
  normalizeGeracaoIaOutput,
  validateGeracaoIaOutput,
} from '@/lib/campanhaAnualSchema';
import { buildMockGeracaoFromInput } from '@/lib/campanhaAnualMock';

export { buildMockGeracaoFromInput } from '@/lib/campanhaAnualMock';

export const CAMPANHA_IA_BATCHES = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
];

async function postLote(inputIa, meses, jwt) {
  const res = await fetch('/api/campanha-anual', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      input: inputIa,
      meses,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * Gera o ano completo: 3 lotes no client (compatível com Vercel Hobby 60s).
 */
export async function requestGeracaoCampanhaAnual(inputIa, { onBatchProgress } = {}) {
  const useMock =
    String(import.meta.env.VITE_CAMPANHA_IA_MOCK || '').trim() === '1';

  if (useMock) {
    return {
      sucesso: true,
      model: 'mock-local',
      usage: { input_tokens: 0, output_tokens: 0 },
      geracao_valid: true,
      ...buildMockGeracaoFromInput(inputIa),
    };
  }

  const jwt = await createSessionJwt();
  if (!jwt) {
    const err = new Error('Sessão inválida. Faça login novamente.');
    err.code = 'unauthorized';
    throw err;
  }

  const byMes = new Map();
  const avisos = [];
  const sugestoes = [];
  let model = null;
  let totalIn = 0;
  let totalOut = 0;
  let anyInvalid = false;
  const allErrors = {};

  for (let i = 0; i < CAMPANHA_IA_BATCHES.length; i += 1) {
    const meses = CAMPANHA_IA_BATCHES[i];
    onBatchProgress?.({
      batch: i + 1,
      total: CAMPANHA_IA_BATCHES.length,
      meses,
    });

    const { res, data } = await postLote(inputIa, meses, jwt);

    if (!res.ok) {
      if (import.meta.env.DEV && (res.status === 404 || res.status === 503)) {
        console.warn('[campanhaAnualIa] API indisponível — mock local', data);
        return {
          sucesso: true,
          model: 'mock-local-fallback',
          usage: { input_tokens: 0, output_tokens: 0 },
          geracao_valid: true,
          ...buildMockGeracaoFromInput(inputIa),
        };
      }
      const msg =
        data?.message ||
        data?.error ||
        `Erro HTTP ${res.status} no lote ${meses.join('-')}`;
      const err = new Error(typeof msg === 'string' ? msg : 'Falha na geração');
      err.code = data?.error;
      err.details = data;
      throw err;
    }

    model = data.model || model;
    totalIn += Number(data.usage?.input_tokens || 0);
    totalOut += Number(data.usage?.output_tokens || 0);
    if (data.geracao_valid === false) {
      anyInvalid = true;
      Object.assign(allErrors, data.geracao_errors || {});
    }
    for (const c of data.campanhas || []) {
      byMes.set(Number(c.mes), c);
    }
    if (Array.isArray(data.avisos)) avisos.push(...data.avisos);
    if (Array.isArray(data.sugestoes)) sugestoes.push(...data.sugestoes);
  }

  const merged = normalizeGeracaoIaOutput({
    status: 'sucesso',
    campanhas: Array.from({ length: 12 }, (_, idx) => byMes.get(idx + 1) || { mes: idx + 1 }),
    avisos,
    sugestoes,
  });

  const { valid, errors, value } = validateGeracaoIaOutput(
    merged,
    inputIa.ciclos_comerciais
  );

  return {
    sucesso: true,
    model,
    usage: { input_tokens: totalIn, output_tokens: totalOut },
    geracao_valid: valid && !anyInvalid,
    geracao_errors: valid && !anyInvalid ? null : { ...allErrors, ...errors },
    ...value,
  };
}

/**
 * Gera via API, aplica no payload anual e persiste no Brief.
 */
export async function gerarESalvarCampanhaAnual({
  briefingId,
  empresa,
  ano,
  ciclos_comerciais,
  briefings_mes,
  existingPayload,
  onBatchProgress,
}) {
  if (!briefingId) {
    throw new Error('Salve o plano anual antes de gerar com IA');
  }

  const inputIa = buildInputIaFromAnual({
    empresa,
    ciclos_comerciais,
    briefings_mes,
    ano,
  });

  const iaResult = await requestGeracaoCampanhaAnual(inputIa, { onBatchProgress });
  const applied = applyGeracaoIaToAnual(existingPayload || {}, iaResult, {
    model: iaResult.model,
  });

  applied.geracao = {
    ...applied.geracao,
    tokens_estimados:
      (iaResult.usage?.input_tokens || 0) + (iaResult.usage?.output_tokens || 0),
  };

  const normalized = normalizeCampanhaAnualPayload(applied);
  const updated = await Brief.update(briefingId, {
    ...normalized,
    status: 'DRAFT',
    title: existingPayload?.title || `Plano anual ${ano}`,
    editado_em: new Date().toISOString(),
    completion_score: 85,
  });

  return {
    brief: updated,
    payload: normalizeCampanhaAnualPayload(updated),
    iaResult,
    geracao_valid: applied._geracao_valid !== false && iaResult.geracao_valid !== false,
  };
}

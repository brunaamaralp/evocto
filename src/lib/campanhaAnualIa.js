import { Brief } from '@/api/entities';
import { createSessionJwt } from '@/lib/appwrite';
import {
  applyGeracaoIaToAnual,
  applyTemasEscolhidosToSeeds,
  applyTemasIaToAnual,
  buildInputIaFromAnual,
  countTemasEscolhidos,
  normalizeCampanhaAnualPayload,
  normalizeGeracaoIaOutput,
  normalizeTemasSugeridos,
  validateGeracaoIaOutput,
} from '@/lib/campanhaAnualSchema';
import { buildMockGeracaoFromInput } from '@/lib/campanhaAnualMock';
import { buildMockTemasFromInput } from '@/lib/campanhaAnualTemasMock';

export { buildMockGeracaoFromInput } from '@/lib/campanhaAnualMock';
export { buildMockTemasFromInput } from '@/lib/campanhaAnualTemasMock';

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
 * Sugere temas (1 principal + 1 alternativa por mês).
 */
export async function requestSugestaoTemas(inputIa) {
  const useMock =
    String(import.meta.env.VITE_CAMPANHA_IA_MOCK || '').trim() === '1';

  if (useMock) {
    return {
      sucesso: true,
      model: 'mock-local-temas',
      usage: { input_tokens: 0, output_tokens: 0 },
      temas_valid: true,
      ...buildMockTemasFromInput(inputIa),
    };
  }

  const jwt = await createSessionJwt();
  if (!jwt) {
    const err = new Error('Sessão inválida. Faça login novamente.');
    err.code = 'unauthorized';
    throw err;
  }

  const res = await fetch('/api/campanha-anual-temas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ input: inputIa }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (import.meta.env.DEV && (res.status === 404 || res.status === 503)) {
      console.warn('[campanhaAnualIa] API temas indisponível — mock local', data);
      return {
        sucesso: true,
        model: 'mock-local-temas-fallback',
        usage: { input_tokens: 0, output_tokens: 0 },
        temas_valid: true,
        ...buildMockTemasFromInput(inputIa),
      };
    }
    const msg = data?.message || data?.error || `Erro HTTP ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : 'Falha ao sugerir temas');
    err.code = data?.error;
    err.details = data;
    throw err;
  }

  return {
    sucesso: true,
    model: data.model,
    usage: data.usage || { input_tokens: 0, output_tokens: 0 },
    temas_valid: data.temas_valid !== false,
    temas: normalizeTemasSugeridos(data.temas, inputIa.ciclos_comerciais),
  };
}

/**
 * Sugere temas via API, aplica no payload e persiste.
 */
export async function gerarESalvarTemas({
  briefingId,
  empresa,
  ano,
  ciclos_comerciais,
  briefings_mes,
  existingPayload,
}) {
  if (!briefingId) {
    throw new Error('Salve o plano anual antes de sugerir temas');
  }

  const inputIa = buildInputIaFromAnual({
    empresa,
    ciclos_comerciais,
    briefings_mes,
    ano,
  });

  const iaResult = await requestSugestaoTemas(inputIa);
  const applied = applyTemasIaToAnual(existingPayload || {}, iaResult, {
    model: iaResult.model,
  });

  const normalized = normalizeCampanhaAnualPayload(applied);
  const updated = await Brief.update(briefingId, {
    ...normalized,
    status: 'DRAFT',
    title: existingPayload?.title || `Plano anual ${ano}`,
    editado_em: new Date().toISOString(),
    completion_score: 70,
  });

  return {
    brief: updated,
    payload: normalizeCampanhaAnualPayload(updated),
    iaResult,
    temas_valid: iaResult.temas_valid !== false,
  };
}

/**
 * Persiste escolha/edição de temas sem nova chamada IA.
 */
export async function salvarTemasEscolhidos({
  briefingId,
  temas_sugeridos,
  existingPayload,
  ano,
}) {
  if (!briefingId) throw new Error('briefingId obrigatório');
  const base = normalizeCampanhaAnualPayload(existingPayload || {});
  const temas = normalizeTemasSugeridos(temas_sugeridos, base.ciclos_comerciais);
  const { complete } = countTemasEscolhidos(temas);
  const next = {
    ...base,
    temas_sugeridos: temas,
    temas_gerados: true,
    status_anual: complete ? 'temas_prontos' : base.status_anual,
    editado_em: new Date().toISOString(),
  };
  const updated = await Brief.update(briefingId, {
    ...next,
    status: 'DRAFT',
    title: existingPayload?.title || `Plano anual ${ano || base.ano}`,
    completion_score: complete ? 75 : 65,
  });
  return {
    brief: updated,
    payload: normalizeCampanhaAnualPayload(updated),
  };
}

/**
 * Gera via API, aplica no payload anual e persiste no Brief.
 * Se houver temas escolhidos, aplica-os como seeds efetivos.
 */
export async function gerarESalvarCampanhaAnual({
  briefingId,
  empresa,
  ano,
  ciclos_comerciais,
  briefings_mes,
  temas_sugeridos = null,
  existingPayload,
  onBatchProgress,
}) {
  if (!briefingId) {
    throw new Error('Salve o plano anual antes de gerar com IA');
  }

  const seedsEfetivos =
    temas_sugeridos?.length || existingPayload?.temas_sugeridos?.length
      ? applyTemasEscolhidosToSeeds(
          temas_sugeridos || existingPayload.temas_sugeridos,
          ciclos_comerciais,
          briefings_mes
        )
      : briefings_mes;

  const inputIa = buildInputIaFromAnual({
    empresa,
    ciclos_comerciais,
    briefings_mes: seedsEfetivos,
    ano,
  });

  const iaResult = await requestGeracaoCampanhaAnual(inputIa, { onBatchProgress });
  const applied = applyGeracaoIaToAnual(existingPayload || {}, iaResult, {
    model: iaResult.model,
  });

  applied.briefings_mes = seedsEfetivos;
  if (temas_sugeridos || existingPayload?.temas_sugeridos) {
    applied.temas_sugeridos = normalizeTemasSugeridos(
      temas_sugeridos || existingPayload.temas_sugeridos,
      ciclos_comerciais
    );
    applied.temas_gerados = true;
  }

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

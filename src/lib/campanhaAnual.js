import { Brief } from '@/api/entities';
import {
  BRIEF_KIND_ANUAL,
  DEFAULT_CICLOS_COMERCIAIS,
  buildCampanhaAnualBriefPayload,
  normalizeCampanhaAnualPayload,
  validateCampanhaAnualDraft,
  validateProdutosLinhas,
} from '@/lib/campanhaAnualSchema';

/**
 * Salva (create/update) plano anual no Brief.
 */
export async function saveCampanhaAnualBriefing({
  briefingId = null,
  agencyId,
  clientId,
  empresa,
  ano,
  ciclos_comerciais,
  briefings_mes = null,
  userId = null,
  existing = null,
}) {
  if (!agencyId || !clientId) {
    const err = new Error('agencyId e clientId obrigatórios');
    throw err;
  }
  if (!empresa?.id) {
    const err = new Error('Configure a empresa antes de salvar o plano anual');
    throw err;
  }

  const prod = validateProdutosLinhas(empresa.produtos_linhas, { required: true });
  if (!prod.valid) {
    const err = new Error('Cadastre ao menos uma linha/produto na empresa');
    err.errors = prod.errors;
    throw err;
  }

  const payload = buildCampanhaAnualBriefPayload({
    agencyId,
    clientId,
    empresa,
    ano,
    ciclos_comerciais: ciclos_comerciais || DEFAULT_CICLOS_COMERCIAIS,
    briefings_mes,
    userId,
    existing,
  });

  const { valid, errors } = validateCampanhaAnualDraft(payload);
  if (!valid) {
    const err = new Error('Plano anual incompleto');
    err.errors = errors;
    throw err;
  }

  if (briefingId) {
    return Brief.update(briefingId, {
      ...payload,
      editado_em: new Date().toISOString(),
    });
  }

  return Brief.create(payload);
}

export async function getCampanhaAnualById(briefingId) {
  if (!briefingId) return null;
  const brief = await Brief.get(briefingId);
  if (!brief) return null;
  if (brief.brief_kind && brief.brief_kind !== BRIEF_KIND_ANUAL) {
    const err = new Error('Este briefing não é um plano anual');
    err.code = 'wrong_brief_kind';
    throw err;
  }
  return {
    ...brief,
    ...normalizeCampanhaAnualPayload(brief),
  };
}

export function isCampanhaAnual(brief) {
  return brief?.brief_kind === BRIEF_KIND_ANUAL;
}

export const CICLO_LABELS = {
  autoridade: 'Autoridade',
  vendas: 'Vendas',
  engajamento: 'Engajamento',
  reconhecimento: 'Reconhecimento',
};

export const CICLO_HINTS = {
  autoridade: 'Educação, posicionamento, confiança',
  vendas: 'Urgência, oferta, conversão',
  engajamento: 'Comunidade, UGC, participação',
  reconhecimento: 'Brand awareness, identidade',
};

export const MES_LABELS = [
  '',
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

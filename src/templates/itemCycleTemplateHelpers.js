/**
 * Helpers compartilhados — templates de ciclo operacional “item”.
 *
 * Padrão: serviço → ciclo (vazio) → tarefas principais → checklist/subtarefas
 * do `content_item_template` do serviço.
 *
 * Detecção por metadados do template (content_item_template / pipeline / offering_key),
 * nunca por nome exibido do serviço.
 *
 * Novos templates: adicionar em operationalItemCyclePresets.js
 * (ou arquivo canônico dedicado, como Produção de Conteúdo / Sessão de Fotos).
 */

import { normalizeActivityKind } from '@/constants/activityKinds';
import { OPERATIONAL_ITEM_CYCLE_OPTION_METAS } from './operationalItemCyclePresets.js';

export const ITEM_CYCLE_PIPELINE = 'item_cycle';

/**
 * Opções de pipeline operacional leve (além de narrativa / legado).
 * `group` é só organização conceitual/UI — não cria campo no Appwrite.
 */
export const ITEM_CYCLE_OPTIONS = [
  {
    key: 'producao_conteudo',
    aliases: ['conteudo'],
    group: 'conteudo',
    label: 'Produção de Conteúdo',
    selectLabel: 'Produção de Conteúdo — mês + conteúdos',
    hint:
      'Ao criar cada conteúdo, as etapas do template são aplicadas como checklist editável.',
    emptyCycleMessage:
      'Mês iniciado — adicione conteúdos (etapas do template aplicadas automaticamente).',
  },
  {
    key: 'sessao_fotos',
    aliases: [],
    group: 'conteudo',
    label: 'Sessão de Fotos',
    selectLabel: 'Sessão de Fotos — mês + sessões',
    hint:
      'Ao criar cada sessão, as etapas do template são aplicadas como checklist editável.',
    emptyCycleMessage:
      'Mês iniciado — adicione sessões (etapas do template aplicadas automaticamente).',
  },
  ...OPERATIONAL_ITEM_CYCLE_OPTION_METAS,
];

const PIPELINE_KEY_SET = new Set(
  ITEM_CYCLE_OPTIONS.flatMap((o) => [o.key, ...(o.aliases || [])]).concat([
    ITEM_CYCLE_PIPELINE,
  ])
);

export function isItemCyclePipelineKey(key) {
  if (!key) return false;
  return PIPELINE_KEY_SET.has(String(key).trim());
}

export function getItemCycleOption(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  return (
    ITEM_CYCLE_OPTIONS.find(
      (o) => o.key === k || (o.aliases || []).includes(k)
    ) || null
  );
}

/**
 * Serviço/template de ciclo operacional com itens sob demanda.
 * Fonte de verdade: presença de content_item_template (ou pipeline/offering conhecidos).
 */
export function isItemCycleService(serviceOrTemplate) {
  if (!serviceOrTemplate) return false;
  if (serviceOrTemplate.content_item_template) return true;
  return (
    isItemCyclePipelineKey(serviceOrTemplate.pipeline) ||
    isItemCyclePipelineKey(serviceOrTemplate.offering_key) ||
    isItemCyclePipelineKey(serviceOrTemplate.slug)
  );
}

/**
 * Resolve a lista de passos do content_item_template.
 * Prefere `subtarefas` quando carregam identidade estrutural (id / activityKind);
 * caso contrário usa `checklist`.
 *
 * @param {object} tpl content_item_template
 * @returns {object[]}
 */
export function resolveContentItemSteps(tpl) {
  if (!tpl || typeof tpl !== 'object') return [];
  const subtarefas = Array.isArray(tpl.subtarefas) ? tpl.subtarefas : [];
  const checklist = Array.isArray(tpl.checklist) ? tpl.checklist : [];

  const subtarefasHaveStructure = subtarefas.some(
    (s) => s?.id || s?.activityKind || s?.templateStepId
  );
  if (subtarefasHaveStructure) return subtarefas;
  if (checklist.length > 0) return checklist;
  return subtarefas;
}

/**
 * Identidade canônica do passo no template (sem inferir pelo texto).
 * @param {object} step
 * @param {number} index
 * @returns {string | null}
 */
export function resolveTemplateStepId(step, index = 0) {
  const raw =
    step?.templateStepId ??
    step?.id ??
    null;
  if (raw == null) return null;
  const id = String(raw).trim();
  if (!id) return null;
  // Ids efêmeros legados (Date.now / random) — não são identidade de template
  if (/^\d+$/.test(id)) return null;
  if (/_\d{10,}_/.test(id)) return null;
  if (/^(checklist|cl|item)_\d+/.test(id)) return null;
  if (/^step_\d+_\d+$/.test(id)) return null;
  // Índice puro não serve
  if (id === String(index)) return null;
  return id;
}

/**
 * Normaliza um passo de template/checklist para o contrato V2.3.
 * Campos novos são opcionais — checklists antigos continuam válidos.
 *
 * @param {object} step
 * @param {number} index
 * @param {{ generateFallbackId?: boolean }} [opts]
 */
export function normalizeChecklistStepFromTemplate(step, index = 0, opts = {}) {
  const generateFallbackId = opts.generateFallbackId !== false;
  const templateStepId = resolveTemplateStepId(step, index);
  const activityKind = normalizeActivityKind(step?.activityKind);

  let id = templateStepId;
  if (!id && step?.id != null && String(step.id).trim()) {
    id = String(step.id).trim();
  }
  if (!id && generateFallbackId) {
    id = `step_${index}_${Date.now()}`;
  }

  return {
    id,
    templateStepId: templateStepId || null,
    text: step?.text || step?.title || `Etapa ${index + 1}`,
    completed: Boolean(step?.completed),
    required: step?.required !== false,
    order: step?.order ?? index,
    assignedTo: step?.assignedTo ?? null,
    dueDate: step?.dueDate ?? null,
    evidenceRequired: Boolean(step?.evidenceRequired),
    evidenceUrls: Array.isArray(step?.evidenceUrls) ? step.evidenceUrls : [],
    activityKind,
  };
}

/**
 * Monta checklist a partir do content_item_template do serviço.
 * Sem template → lista vazia (não inventa etapas).
 *
 * V2.3: preserva `templateStepId` + `activityKind` + id canônico do passo.
 * Ids efêmeros só quando o passo não tem identidade estrutural.
 */
export function buildChecklistFromContentItemTemplate(service, prefix = 'item') {
  const tpl = service?.content_item_template;
  if (!tpl) return [];

  const steps = resolveContentItemSteps(tpl);
  if (!steps.length) return [];

  const usedIds = new Set();

  return steps.map((item, index) => {
    const normalized = normalizeChecklistStepFromTemplate(item, index, {
      generateFallbackId: false,
    });

    let id = normalized.id;
    if (!id || usedIds.has(id)) {
      const key = String(service?.offering_key || service?.slug || prefix).slice(0, 12);
      const base = normalized.templateStepId || `step_${index}`;
      id = usedIds.has(base) ? `${key}_${base}_${index}` : base;
      if (usedIds.has(id)) id = `${id}_${Date.now()}_${index}`;
    }
    usedIds.add(id);

    return {
      ...normalized,
      id,
      completed: false,
    };
  });
}

const PRE_APPROVAL_STEP_KEYS = new Set(['roteiro', 'producao', 'edicao']);

function normalizeChecklistStepKey(text = '') {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isPreApprovalChecklistStep(item = {}) {
  const candidates = [
    item.templateStepId,
    item.id,
  ]
    .map((v) => String(v || '').toLowerCase().trim())
    .filter(Boolean);

  for (const stepId of candidates) {
    if (PRE_APPROVAL_STEP_KEYS.has(stepId)) return true;
    // ids compostos legados: producao_conteudo_roteiro_…
    for (const key of PRE_APPROVAL_STEP_KEYS) {
      if (stepId === key || stepId.endsWith(`_${key}`) || stepId.includes(`_${key}_`)) {
        return true;
      }
    }
  }

  const normalized = normalizeChecklistStepKey(item.text || item.title);
  return PRE_APPROVAL_STEP_KEYS.has(normalized);
}

/**
 * Checklist para conteúdo já produzido: etapas anteriores marcadas, aprovação em aberto.
 */
export function buildReadyForApprovalChecklist(service, prefix = 'item') {
  const checklist = buildChecklistFromContentItemTemplate(service, prefix);
  if (!checklist.length) return checklist;

  return checklist.map((item) => ({
    ...item,
    completed: isPreApprovalChecklistStep(item) ? true : item.completed,
  }));
}

/**
 * Título do ciclo: "{Nome do template} — Setembro/2026"
 */
export function formatItemCycleTitle(baseName, startDate) {
  const base = String(baseName || 'Ciclo').trim() || 'Ciclo';
  try {
    const d = new Date(`${String(startDate).slice(0, 10)}T12:00:00`);
    const month = d.toLocaleDateString('pt-BR', { month: 'long' });
    const year = d.getFullYear();
    const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
    return `${base} — ${monthLabel}/${year}`;
  } catch {
    return `${base} — ${String(startDate || '').slice(0, 7)}`;
  }
}

export function resolveItemCycleDisplayName(serviceOrTemplate) {
  if (!serviceOrTemplate) return 'Ciclo';
  const opt =
    getItemCycleOption(serviceOrTemplate.offering_key) ||
    getItemCycleOption(serviceOrTemplate.slug) ||
    getItemCycleOption(serviceOrTemplate.pipeline);
  if (opt?.label) return opt.label;
  const name = String(serviceOrTemplate.name || '').trim();
  if (name && !name.includes(' — ')) return name;
  return opt?.label || name || 'Ciclo';
}

export function resolveItemCyclePipeline(serviceOrTemplate, fallbackKey = null) {
  if (serviceOrTemplate?.pipeline && isItemCyclePipelineKey(serviceOrTemplate.pipeline)) {
    return serviceOrTemplate.pipeline;
  }
  if (serviceOrTemplate?.offering_key && isItemCyclePipelineKey(serviceOrTemplate.offering_key)) {
    return serviceOrTemplate.offering_key;
  }
  if (fallbackKey && isItemCyclePipelineKey(fallbackKey)) return fallbackKey;
  return ITEM_CYCLE_PIPELINE;
}

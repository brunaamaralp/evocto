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
 * Monta checklist a partir do content_item_template do serviço.
 * Sem template → lista vazia (não inventa etapas).
 */
export function buildChecklistFromContentItemTemplate(service, prefix = 'item') {
  const tpl = service?.content_item_template;
  if (!tpl) return [];

  const steps =
    Array.isArray(tpl.checklist) && tpl.checklist.length > 0
      ? tpl.checklist
      : Array.isArray(tpl.subtarefas)
        ? tpl.subtarefas
        : [];

  if (!steps.length) return [];

  const stamp = Date.now();
  const key = String(service?.offering_key || service?.slug || prefix).slice(0, 12);

  return steps.map((item, index) => ({
    id: `${key}_${item.id || index}_${stamp}_${index}`,
    text: item.text || item.title || `Etapa ${index + 1}`,
    completed: false,
    required: item.required !== false,
    order: index,
    assignedTo: null,
    dueDate: null,
    evidenceRequired: false,
    evidenceUrls: [],
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

/**
 * Lookup canônico template_id / templateStepId → activityKind.
 *
 * Fonte: templates reais do repo (mesma base do inventário V2.2/V2.3).
 * Não infere por título. IDs known_gap / container ficam de fora.
 * IDs com kinds conflitantes entre packs entram em `ambiguous`.
 */

import { isValidActivityKind, normalizeActivityKind } from '@/constants/activityKinds';
import {
  isKnownContainerTemplateId,
  isKnownIntentionalNullStepId,
  isKnownIntentionalNullTemplateId,
} from '@/lib/activityKindCoverageKnownGaps';
import { buildNarrativaDeliverablesByTipo } from '@/lib/tipoCampanhaPipeline';
import { CICLO_MENSAL_4_SEMANAS_TEMPLATE } from '@/templates/cicloMensal4SemanasTemplate';
import { CICLO_NARRATIVA_7_FASES_TEMPLATE } from '@/templates/cicloNarrativa7FasesTemplate';
import {
  DIAGNOSTICO_COMUNICACAO_TEMPLATE,
  ESTRATEGIA_CONTEUDO_TEMPLATE,
  MARKETING_360_TEMPLATE,
} from '@/templates/defaultServiceTemplates';
import { OPERATIONAL_ITEM_CYCLE_PRESETS } from '@/templates/operationalItemCyclePresets';
import { DEFAULT_CONTENT_SUBTAREFAS } from '@/templates/producaoConteudoTemplate';
import { DEFAULT_SESSAO_FOTOS_SUBTAREFAS } from '@/templates/sessaoFotosTemplate';
import { buildItemCycleServiceTemplate } from '@/templates/buildItemCycleServiceTemplate';

/**
 * @param {Map<string, string>} map
 * @param {Set<string>} ambiguous
 * @param {string | null | undefined} id
 * @param {unknown} kind
 */
function register(map, ambiguous, id, kind) {
  const key = typeof id === 'string' ? id.trim() : '';
  if (!key) return;
  if (isKnownIntentionalNullTemplateId(key) || isKnownIntentionalNullStepId(key)) {
    return;
  }
  if (isKnownContainerTemplateId(key)) return;

  const normalized = normalizeActivityKind(kind);
  if (!normalized || !isValidActivityKind(normalized)) return;

  if (ambiguous.has(key)) return;

  const prev = map.get(key);
  if (prev == null) {
    map.set(key, normalized);
    return;
  }
  if (prev !== normalized) {
    map.delete(key);
    ambiguous.add(key);
  }
}

/**
 * @param {object[]} deliverables
 * @param {Map<string, string>} byTemplateId
 * @param {Set<string>} ambiguous
 */
function collectFromDeliverables(deliverables, byTemplateId, ambiguous) {
  for (const d of Array.isArray(deliverables) ? deliverables : []) {
    const tasks = d.task_templates || d.tasks || [];
    for (const t of tasks) {
      register(byTemplateId, ambiguous, t?.id, t?.activityKind);
      for (const s of Array.isArray(t?.subtarefas) ? t.subtarefas : []) {
        register(byTemplateId, ambiguous, s?.id, s?.activityKind);
      }
    }
  }
}

/**
 * @param {object[]} steps
 * @param {Map<string, string>} byStepId
 * @param {Set<string>} ambiguous
 */
function collectFromChecklistSteps(steps, byStepId, ambiguous) {
  for (const step of Array.isArray(steps) ? steps : []) {
    register(byStepId, ambiguous, step?.id, step?.activityKind);
  }
}

/**
 * Constrói mapas inequívocos para backfill seletivo.
 * @returns {{
 *   byTemplateId: Map<string, string>,
 *   byStepId: Map<string, string>,
 *   ambiguousTemplateIds: string[],
 *   ambiguousStepIds: string[],
 * }}
 */
export function buildActivityKindTemplateLookup() {
  /** @type {Map<string, string>} */
  const byTemplateId = new Map();
  /** @type {Map<string, string>} */
  const byStepId = new Map();
  /** @type {Set<string>} */
  const ambiguousTemplates = new Set();
  /** @type {Set<string>} */
  const ambiguousSteps = new Set();

  collectFromDeliverables(
    CICLO_NARRATIVA_7_FASES_TEMPLATE.deliverables,
    byTemplateId,
    ambiguousTemplates
  );
  collectFromDeliverables(
    CICLO_MENSAL_4_SEMANAS_TEMPLATE.deliverables,
    byTemplateId,
    ambiguousTemplates
  );
  for (const tipo of ['ugc', 'influenciador']) {
    collectFromDeliverables(
      buildNarrativaDeliverablesByTipo(tipo),
      byTemplateId,
      ambiguousTemplates
    );
  }
  for (const tpl of [
    DIAGNOSTICO_COMUNICACAO_TEMPLATE,
    ESTRATEGIA_CONTEUDO_TEMPLATE,
    MARKETING_360_TEMPLATE,
  ]) {
    collectFromDeliverables(tpl.deliverables, byTemplateId, ambiguousTemplates);
  }

  collectFromChecklistSteps(DEFAULT_CONTENT_SUBTAREFAS, byStepId, ambiguousSteps);
  collectFromChecklistSteps(DEFAULT_SESSAO_FOTOS_SUBTAREFAS, byStepId, ambiguousSteps);

  for (const preset of OPERATIONAL_ITEM_CYCLE_PRESETS) {
    const built = buildItemCycleServiceTemplate(preset);
    const steps = built?.content_item_template?.subtarefas || [];
    collectFromChecklistSteps(steps, byStepId, ambiguousSteps);
  }

  return {
    byTemplateId,
    byStepId,
    ambiguousTemplateIds: [...ambiguousTemplates].sort(),
    ambiguousStepIds: [...ambiguousSteps].sort(),
  };
}

/**
 * Resolve kind inequívoco para um id de template de Task.
 * @param {string | null | undefined} templateId
 * @param {{ byTemplateId?: Map<string, string>, ambiguousTemplateIds?: string[] }} [lookup]
 * @returns {{ kind: string | null, reason: string | null }}
 */
export function resolveTemplateIdActivityKind(templateId, lookup) {
  const key = typeof templateId === 'string' ? templateId.trim() : '';
  if (!key) return { kind: null, reason: 'missing_template_id' };
  if (isKnownIntentionalNullTemplateId(key) || isKnownContainerTemplateId(key)) {
    return { kind: null, reason: 'known_gap_or_container' };
  }
  const table = lookup?.byTemplateId || buildActivityKindTemplateLookup().byTemplateId;
  const ambiguous = new Set(lookup?.ambiguousTemplateIds || []);
  if (ambiguous.has(key)) return { kind: null, reason: 'ambiguous_id' };
  const kind = table.get(key) || null;
  if (!kind) return { kind: null, reason: 'unknown_template_id' };
  return { kind, reason: null };
}

/**
 * Resolve kind inequívoco para templateStepId de checklist.
 * @param {string | null | undefined} templateStepId
 * @param {{ byStepId?: Map<string, string>, ambiguousStepIds?: string[] }} [lookup]
 * @returns {{ kind: string | null, reason: string | null }}
 */
export function resolveStepIdActivityKind(templateStepId, lookup) {
  const key = typeof templateStepId === 'string' ? templateStepId.trim() : '';
  if (!key) return { kind: null, reason: 'missing_step_id' };
  if (isKnownIntentionalNullStepId(key)) {
    return { kind: null, reason: 'known_gap_or_container' };
  }
  const table = lookup?.byStepId || buildActivityKindTemplateLookup().byStepId;
  const ambiguous = new Set(lookup?.ambiguousStepIds || []);
  if (ambiguous.has(key)) return { kind: null, reason: 'ambiguous_id' };
  const kind = table.get(key) || null;
  if (!kind) return { kind: null, reason: 'unknown_step_id' };
  return { kind, reason: null };
}

/**
 * V2.4 — Observabilidade da cobertura do contrato activityKind.
 *
 * Mede COBERTURA DO CONTRATO (natureza identificada), não mapeamento
 * para fases do ciclo operacional.
 *
 * Não grava métricas. Não faz backfill. Não altera Tasks.
 */

import {
  ACTIVITY_KIND_DEFINITIONS,
  getActivityKindLabel,
  isValidActivityKind,
} from '@/constants/activityKinds';
import {
  isKnownContainerTemplateId,
  isKnownIntentionalNullStepId,
  isKnownIntentionalNullTemplateId,
} from '@/lib/activityKindCoverageKnownGaps';
import { ITEM_CYCLE_PIPELINE } from '@/templates/itemCycleTemplateHelpers';

/** @typedef {'classified' | 'unclassified' | 'intentional_container' | 'known_gap' | 'invalid_kind' | 'legacy'} CoverageStatus */

/** @typedef {'task' | 'checklist'} WorkUnitSource */

/** @typedef {'template' | 'manual' | 'item_cycle' | 'unknown'} WorkUnitOrigin */

/**
 * @typedef {object} CoverageWorkUnit
 * @property {string} id
 * @property {string} title
 * @property {CoverageStatus} status
 * @property {string | null} activityKind
 * @property {string | null} rawActivityKind
 * @property {WorkUnitSource} source
 * @property {WorkUnitOrigin} origin
 * @property {string} reason
 * @property {boolean} classifiable
 * @property {string | null} taskId
 * @property {string | null} checklistItemId
 * @property {string | null} templateId
 * @property {string | null} templateStepId
 * @property {string | null} agencyId
 * @property {string | null} clientId
 * @property {string | null} serviceId
 * @property {string | null} pipeline
 */

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function rawKindString(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t || null;
}

/**
 * @param {object} task
 * @returns {boolean}
 */
export function taskHasStructuredChecklist(task) {
  const list = Array.isArray(task?.checklist) ? task.checklist : [];
  return list.some((item) => {
    const stepId = item?.templateStepId;
    return typeof stepId === 'string' && stepId.trim().length > 0;
  });
}

/**
 * @param {object} task
 * @returns {boolean}
 */
function isItemCyclePipeline(task) {
  const p = String(task?.pipeline || '').trim();
  if (!p) return false;
  if (p === ITEM_CYCLE_PIPELINE) return true;
  // offering keys usados como pipeline em createServiceUnitTask
  return (
    p === 'producao_conteudo' ||
    p === 'sessao_fotos' ||
    p === 'conteudo'
  );
}

/**
 * Resolve origem estrutural (sem inferir por título).
 * @param {'task' | 'checklist'} source
 * @param {object} task
 * @param {object | null} checklistItem
 * @returns {WorkUnitOrigin}
 */
export function resolveWorkUnitOrigin(source, task, checklistItem = null) {
  if (source === 'checklist') {
    const stepId = checklistItem?.templateStepId;
    if (typeof stepId === 'string' && stepId.trim()) {
      return 'item_cycle';
    }
    return 'manual';
  }

  if (task?.created_from_template === true || task?.template_id) {
    return 'template';
  }
  if (isItemCyclePipeline(task) || taskHasStructuredChecklist(task)) {
    return 'item_cycle';
  }
  // Sem sinais de template → trata como manual (UI ainda não exige kind).
  if (task?.created_from_template === false || (!task?.template_id && !task?.created_from_template)) {
    // Heurística conservadora: ausência de template_id + created_from_template ≠ true
    if (!task?.template_id && task?.created_from_template !== true) {
      return 'manual';
    }
  }
  return 'unknown';
}

/**
 * Classifica uma unidade de trabalho já extraída (leaf task ou checklist item).
 * @param {object} params
 * @returns {Omit<CoverageWorkUnit, 'id' | 'title' | 'source' | 'taskId' | 'checklistItemId' | 'agencyId' | 'clientId' | 'serviceId' | 'pipeline'> & { status: CoverageStatus, classifiable: boolean }}
 */
export function classifyActivityKindCoverage({
  activityKind,
  templateId = null,
  templateStepId = null,
  origin = 'unknown',
}) {
  const raw = rawKindString(activityKind);

  if (raw && !isValidActivityKind(raw)) {
    return {
      status: 'invalid_kind',
      activityKind: null,
      rawActivityKind: raw,
      origin,
      reason: `Valor persistido "${raw}" fora do registry canônico`,
      classifiable: true,
      templateId: templateId || null,
      templateStepId: templateStepId || null,
    };
  }

  if (raw && isValidActivityKind(raw)) {
    return {
      status: 'classified',
      activityKind: raw,
      rawActivityKind: raw,
      origin,
      reason: 'activityKind válido no registry',
      classifiable: true,
      templateId: templateId || null,
      templateStepId: templateStepId || null,
    };
  }

  // null / vazio
  if (isKnownIntentionalNullTemplateId(templateId) || isKnownIntentionalNullStepId(templateStepId)) {
    return {
      status: 'known_gap',
      activityKind: null,
      rawActivityKind: null,
      origin,
      reason: 'Null deliberado / ambíguo conhecido (V2.2–V2.3)',
      classifiable: true,
      templateId: templateId || null,
      templateStepId: templateStepId || null,
    };
  }

  if (origin === 'manual') {
    return {
      status: 'unclassified',
      activityKind: null,
      rawActivityKind: null,
      origin: 'manual',
      reason: 'Origem manual sem activityKind (UI ainda não exige)',
      classifiable: true,
      templateId: templateId || null,
      templateStepId: templateStepId || null,
    };
  }

  // Legado não é distinguível com segurança (sem marcador de rollout).
  // Conservador: unclassified + reason explícita.
  return {
    status: 'unclassified',
    activityKind: null,
    rawActivityKind: null,
    origin,
    reason:
      'Sem activityKind — legado pré-contrato e lacuna de template atual são indistinguíveis com os metadados atuais',
    classifiable: true,
    templateId: templateId || null,
    templateStepId: templateStepId || null,
  };
}

/**
 * Extrai unidades de trabalho sem dupla contagem.
 *
 * Regras:
 * - Parent com children no universo → container; children são as unidades.
 * - Task com checklist estruturado (templateStepId) e sem children → container;
 *   checklist items são as unidades.
 * - Demais leafs → a própria Task é a unidade (checklist livre ignorado).
 *
 * @param {object[]} tasks
 * @param {{ agencyId?: string | null }} [options]
 * @returns {CoverageWorkUnit[]}
 */
export function extractClassifiableWorkUnits(tasks, options = {}) {
  const agencyId = options.agencyId != null ? String(options.agencyId) : null;
  const list = (Array.isArray(tasks) ? tasks : []).filter((t) => {
    if (!t || !t.id) return false;
    if (agencyId && String(t.agencyId || '') !== agencyId) return false;
    return true;
  });

  const byId = new Map(list.map((t) => [t.id, t]));
  const parentIdsWithChildren = new Set();
  for (const t of list) {
    const pid = t.parentTaskId;
    if (pid && byId.has(pid)) parentIdsWithChildren.add(pid);
  }

  /** @type {CoverageWorkUnit[]} */
  const units = [];

  for (const task of list) {
    const hasChildren = parentIdsWithChildren.has(task.id);
    const structured = taskHasStructuredChecklist(task);
    const knownContainerTpl = isKnownContainerTemplateId(task.template_id);

    // 1) Parent com children no universo → container; trabalho nas children
    //    (checklist do parent ignorado para evitar dupla contagem)
    if (hasChildren) {
      units.push({
        id: `task:${task.id}`,
        title: String(task.title || '(task)'),
        status: 'intentional_container',
        activityKind: null,
        rawActivityKind: rawKindString(task.activityKind),
        source: 'task',
        origin: resolveWorkUnitOrigin('task', task),
        reason: 'Parent com subtarefas — trabalho nas children',
        classifiable: false,
        taskId: task.id,
        checklistItemId: null,
        templateId: task.template_id || null,
        templateStepId: null,
        agencyId: task.agencyId || null,
        clientId: task.clientId || null,
        serviceId: task.serviceId || null,
        pipeline: task.pipeline || null,
      });
      continue;
    }

    // 2) Checklist estruturado (V2.3) → unit/container; trabalho nos itens
    if (structured) {
      const checklist = Array.isArray(task.checklist) ? task.checklist : [];
      for (const item of checklist) {
        const origin = resolveWorkUnitOrigin('checklist', task, item);
        const classified = classifyActivityKindCoverage({
          activityKind: item?.activityKind,
          templateId: task.template_id || null,
          templateStepId: item?.templateStepId || null,
          origin,
        });
        units.push({
          id: `checklist:${task.id}:${item?.id || item?.templateStepId || 'anon'}`,
          title: String(item?.text || item?.title || '(checklist item)'),
          ...classified,
          source: 'checklist',
          taskId: task.id,
          checklistItemId: item?.id || null,
          agencyId: task.agencyId || null,
          clientId: task.clientId || null,
          serviceId: task.serviceId || null,
          pipeline: task.pipeline || null,
        });
      }
      units.push({
        id: `task:${task.id}`,
        title: String(task.title || '(task)'),
        status: 'intentional_container',
        activityKind: null,
        rawActivityKind: rawKindString(task.activityKind),
        source: 'task',
        origin: resolveWorkUnitOrigin('task', task),
        reason: 'Task com checklist estruturado — trabalho nas etapas',
        classifiable: false,
        taskId: task.id,
        checklistItemId: null,
        templateId: task.template_id || null,
        templateStepId: null,
        agencyId: task.agencyId || null,
        clientId: task.clientId || null,
        serviceId: task.serviceId || null,
        pipeline: task.pipeline || null,
      });
      continue;
    }

    // 3) Template container conhecido sem children no universo (amostra parcial)
    if (knownContainerTpl) {
      units.push({
        id: `task:${task.id}`,
        title: String(task.title || '(task)'),
        status: 'intentional_container',
        activityKind: null,
        rawActivityKind: rawKindString(task.activityKind),
        source: 'task',
        origin: resolveWorkUnitOrigin('task', task),
        reason: 'Template container conhecido (children ausentes no universo)',
        classifiable: false,
        taskId: task.id,
        checklistItemId: null,
        templateId: task.template_id || null,
        templateStepId: null,
        agencyId: task.agencyId || null,
        clientId: task.clientId || null,
        serviceId: task.serviceId || null,
        pipeline: task.pipeline || null,
      });
      continue;
    }

    // 4) Leaf executável
    const origin = resolveWorkUnitOrigin('task', task);
    const classified = classifyActivityKindCoverage({
      activityKind: task.activityKind,
      templateId: task.template_id || null,
      templateStepId: null,
      origin,
    });
    units.push({
      id: `task:${task.id}`,
      title: String(task.title || '(task)'),
      ...classified,
      source: 'task',
      taskId: task.id,
      checklistItemId: null,
      agencyId: task.agencyId || null,
      clientId: task.clientId || null,
      serviceId: task.serviceId || null,
      pipeline: task.pipeline || null,
    });
  }

  return units;
}

/**
 * @param {CoverageWorkUnit[]} units
 */
function buildByKind(units) {
  const classifiable = units.filter((u) => u.classifiable && u.status === 'classified');
  /** @type {Record<string, number>} */
  const counts = {};
  for (const u of classifiable) {
    const k = u.activityKind;
    if (!k) continue;
    counts[k] = (counts[k] || 0) + 1;
  }
  return ACTIVITY_KIND_DEFINITIONS.map((def) => ({
    key: def.key,
    label: def.label,
    count: counts[def.key] || 0,
  })).filter((row) => row.count > 0);
}

/**
 * @param {CoverageWorkUnit[]} units
 */
function buildBySource(units) {
  const classifiable = units.filter((u) => u.classifiable);
  const taskUnits = classifiable.filter((u) => u.source === 'task');
  const checklistUnits = classifiable.filter((u) => u.source === 'checklist');
  const countClassified = (arr) => arr.filter((u) => u.status === 'classified').length;

  return {
    task: {
      classifiable: taskUnits.length,
      classified: countClassified(taskUnits),
      unclassified: taskUnits.filter((u) => u.status === 'unclassified' || u.status === 'known_gap').length,
      invalidKind: taskUnits.filter((u) => u.status === 'invalid_kind').length,
    },
    checklist: {
      classifiable: checklistUnits.length,
      classified: countClassified(checklistUnits),
      unclassified: checklistUnits.filter((u) => u.status === 'unclassified' || u.status === 'known_gap').length,
      invalidKind: checklistUnits.filter((u) => u.status === 'invalid_kind').length,
    },
    containers: units.filter((u) => u.status === 'intentional_container').length,
  };
}

/**
 * @param {CoverageWorkUnit[]} units
 */
function buildByOrigin(units) {
  const classifiable = units.filter((u) => u.classifiable);
  /** @type {Record<string, { classifiable: number, classified: number, unclassified: number }>} */
  const out = {};
  for (const origin of ['template', 'manual', 'item_cycle', 'unknown']) {
    const subset = classifiable.filter((u) => u.origin === origin);
    out[origin] = {
      classifiable: subset.length,
      classified: subset.filter((u) => u.status === 'classified').length,
      unclassified: subset.filter(
        (u) => u.status === 'unclassified' || u.status === 'known_gap' || u.status === 'invalid_kind'
      ).length,
    };
  }
  return out;
}

/**
 * Breakdown por template_id (apenas unidades classificáveis).
 * @param {CoverageWorkUnit[]} units
 */
function buildByTemplate(units) {
  /** @type {Map<string, { templateId: string, classifiable: number, classified: number, issues: CoverageWorkUnit[] }>} */
  const map = new Map();
  for (const u of units) {
    if (!u.classifiable) continue;
    const key = u.templateId || u.templateStepId || '(sem template)';
    if (!map.has(key)) {
      map.set(key, {
        templateId: u.templateId || null,
        templateStepId: u.templateStepId || null,
        label: key,
        classifiable: 0,
        classified: 0,
        issues: [],
      });
    }
    const row = map.get(key);
    row.classifiable += 1;
    if (u.status === 'classified') row.classified += 1;
    else row.issues.push(u);
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      coveragePercent:
        row.classifiable > 0
          ? Math.round((row.classified / row.classifiable) * 1000) / 10
          : null,
    }))
    .sort((a, b) => (a.coveragePercent ?? 101) - (b.coveragePercent ?? 101));
}

/**
 * Analisa cobertura activityKind sobre um conjunto de Tasks.
 *
 * @param {object[]} tasks
 * @param {{
 *   agencyId?: string | null,
 *   universeLabel?: string,
 * }} [options]
 */
export function analyzeActivityKindCoverage(tasks, options = {}) {
  const agencyId = options.agencyId != null ? String(options.agencyId) : null;
  const inputCount = Array.isArray(tasks) ? tasks.length : 0;
  const units = extractClassifiableWorkUnits(tasks, { agencyId });

  const classifiable = units.filter((u) => u.classifiable);
  const classified = classifiable.filter((u) => u.status === 'classified');
  const unclassified = classifiable.filter((u) => u.status === 'unclassified');
  const knownGaps = classifiable.filter((u) => u.status === 'known_gap');
  const invalidKind = classifiable.filter((u) => u.status === 'invalid_kind');
  const containers = units.filter((u) => u.status === 'intentional_container');

  const totalClassifiable = classifiable.length;
  const classifiedCount = classified.length;
  // Sem classificação "efetiva" = null inesperado + known_gap + invalid
  const withoutValidKindCount = totalClassifiable - classifiedCount;
  const coveragePercent =
    totalClassifiable > 0
      ? Math.round((classifiedCount / totalClassifiable) * 1000) / 10
      : null;

  const manualUnclassified = unclassified.filter((u) => u.origin === 'manual');
  const templateUnclassified = unclassified.filter((u) => u.origin === 'template');
  const itemCycleUnclassified = unclassified.filter((u) => u.origin === 'item_cycle');

  const taskClassifiable = classifiable.filter((u) => u.source === 'task');
  const checklistClassifiable = classifiable.filter((u) => u.source === 'checklist');

  const issues = classifiable.filter((u) => u.status !== 'classified');

  return {
    universe: {
      label:
        options.universeLabel ||
        'Tasks carregadas no contexto (filtradas por agencyId)',
      agencyId,
      tasksInInput: inputCount,
      tasksInScope: agencyId
        ? (Array.isArray(tasks) ? tasks : []).filter(
            (t) => t && String(t.agencyId || '') === agencyId
          ).length
        : inputCount,
      workUnitsExtracted: units.length,
      legacyDistinguishable: false,
      legacyNote:
        'Não há marcador de rollout confiável (data/versão) para separar legado pré-activityKind de lacuna atual. Legado NÃO é reportado como categoria separada; nulls entram em unclassified/known_gap.',
      coverageSemantics:
        'coveragePercent = classified / totalClassifiable. Containers intencionais fora do denominador. known_gap e invalid_kind entram no denominador e NÃO contam como classified.',
    },
    summary: {
      totalClassifiable,
      classifiedCount,
      unclassifiedCount: unclassified.length,
      knownGapCount: knownGaps.length,
      invalidKindCount: invalidKind.length,
      withoutValidKindCount,
      coveragePercent,
      intentionalContainerCount: containers.length,
      legacyCount: 0,
      legacyDistinguishable: false,
      manualUnclassifiedCount: manualUnclassified.length,
      templateUnclassifiedCount: templateUnclassified.length,
      itemCycleUnclassifiedCount: itemCycleUnclassified.length,
      classifiedTaskCount: taskClassifiable.filter((u) => u.status === 'classified').length,
      unclassifiedTaskCount: taskClassifiable.filter((u) => u.status !== 'classified').length,
      classifiedChecklistItemCount: checklistClassifiable.filter(
        (u) => u.status === 'classified'
      ).length,
      unclassifiedChecklistItemCount: checklistClassifiable.filter(
        (u) => u.status !== 'classified'
      ).length,
    },
    byKind: buildByKind(units),
    bySource: buildBySource(units),
    byOrigin: buildByOrigin(units),
    byTemplate: buildByTemplate(units),
    issues,
    invalidKindItems: invalidKind,
    containers,
    units,
  };
}

/**
 * Helper para UI: label de kind via registry.
 * @param {string | null | undefined} kind
 */
export function coverageKindLabel(kind) {
  return getActivityKindLabel(kind) || (kind ? String(kind) : '—');
}

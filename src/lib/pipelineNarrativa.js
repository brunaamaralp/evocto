/**
 * Pipeline Narrativa — progress, gates, SLA e geração de tarefas embutidas.
 */

import {
  CICLO_NARRATIVA_7_FASES_TEMPLATE,
  NARRATIVA_PHASES,
  flattenTaskTemplates,
} from '@/templates/cicloNarrativa7FasesTemplate';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';

const DONE = new Set(['concluida', 'completed', 'approved', 'skipped', 'cancelada', 'cancelled']);

function addDays(ymd, days) {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function isDoneStatus(status) {
  return DONE.has(String(status || '').toLowerCase());
}

/**
 * Progresso de uma lista de subtarefas / tarefas filhas.
 * @returns {{ total: number, done: number, progress_pct: number }}
 */
export function calcProgress(items = []) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const done = list.filter((t) => isDoneStatus(t.status)).length;
  return {
    total,
    done,
    progress_pct: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/**
 * Status de fase a partir de tarefas da fase + gate.
 * @returns {'concluida'|'em_progresso'|'bloqueada'|'nao_iniciada'}
 */
export function calcPhaseStatus(phaseTasks = [], phaseMeta = {}) {
  const list = Array.isArray(phaseTasks) ? phaseTasks : [];
  if (list.length === 0) return 'nao_iniciada';

  const { progress_pct } = calcProgress(list);
  if (progress_pct >= 100) {
    if (phaseMeta.gatekeeper) {
      const gate = String(phaseMeta.gate_status || 'pendente').toLowerCase();
      if (gate !== 'aprovado' && gate !== 'approved' && gate !== 'skipped') {
        return 'bloqueada';
      }
    }
    return 'concluida';
  }

  const anyOpen = list.some((t) => {
    const s = String(t.status || '').toLowerCase();
    return s !== 'bloqueada' && s !== 'blocked' && !isDoneStatus(s);
  });
  if (anyOpen) return 'em_progresso';

  const allBlocked = list.every((t) => {
    const s = String(t.status || '').toLowerCase();
    return s === 'bloqueada' || s === 'blocked' || isDoneStatus(s);
  });
  if (allBlocked && progress_pct < 100) return 'bloqueada';

  return 'nao_iniciada';
}

/**
 * Pode avançar a fase? 100% subtarefas + gate aprovado (se houver).
 */
export function canTransitionPhase(phaseTasks = [], phaseMeta = {}) {
  const { progress_pct } = calcProgress(phaseTasks);
  if (progress_pct < 100) return { ok: false, reason: 'progress_incomplete' };
  if (phaseMeta.gatekeeper) {
    const gate = String(phaseMeta.gate_status || 'pendente').toLowerCase();
    if (gate !== 'aprovado' && gate !== 'approved' && gate !== 'skipped') {
      return { ok: false, reason: 'gate_pending', gatekeeper: phaseMeta.gatekeeper };
    }
  }
  return { ok: true };
}

/**
 * SLA visual: verde / amarelo / vermelho por dias até vencimento.
 * @param {string} dueYmd
 * @param {string} [todayYmd]
 */
export function slaTone(dueYmd, todayYmd = new Date().toISOString().slice(0, 10)) {
  if (!dueYmd) return { tone: 'neutral', daysLeft: null };
  const due = new Date(`${String(dueYmd).slice(0, 10)}T12:00:00`);
  const today = new Date(`${String(todayYmd).slice(0, 10)}T12:00:00`);
  const daysLeft = Math.round((due - today) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return { tone: 'danger', daysLeft, label: `${Math.abs(daysLeft)}d atrasado` };
  if (daysLeft <= 1) return { tone: 'danger', daysLeft, label: daysLeft === 0 ? 'vence hoje' : '1d restante' };
  if (daysLeft <= 2) return { tone: 'warning', daysLeft, label: `${daysLeft}d restantes` };
  return { tone: 'success', daysLeft, label: `${daysLeft}d restantes` };
}

/**
 * Nível de escalation com base em dias decorridos desde o início da fase.
 */
export function resolveEscalation(phaseMeta = {}, daysElapsed = 0) {
  const rules = Array.isArray(phaseMeta.escalation) ? phaseMeta.escalation : [];
  let hit = null;
  for (const rule of rules) {
    if (daysElapsed >= Number(rule.day || 0)) hit = rule;
  }
  return hit;
}

/**
 * Monta visão de fases para UI (PipelineTimeline).
 * @param {object[]} deliverables
 * @param {object[]} tasks - Task entities (com deliverableId, parentTaskId, status)
 */
export function buildPipelineView(deliverables = [], tasks = []) {
  const phases = normalizeDeliverableTaskShapes(deliverables);
  const taskList = Array.isArray(tasks) ? tasks : [];

  return phases.map((fase, idx) => {
    const phaseTasks = taskList.filter(
      (t) => String(t.deliverableId) === String(fase.id) && !t.parentTaskId
    );
    const childTasks = taskList.filter(
      (t) => String(t.deliverableId) === String(fase.id) && t.parentTaskId
    );

    const progressSource = childTasks.length > 0 ? childTasks : phaseTasks;
    const progress = calcProgress(progressSource);

    const gatekeeper = fase.gatekeeper ?? null;
    const gateFromTask = phaseTasks.find((t) => t.gatekeeper)?.gate_status;
    const gate_status = fase.gate_status || gateFromTask || (gatekeeper ? 'pendente' : null);

    const phaseMeta = {
      gatekeeper,
      gate_status,
      sla_dias: fase.sla_dias,
      sla_prometido_dias: fase.sla_prometido_dias,
      escalation: fase.escalation,
      required: fase.required !== false,
    };

    const status = calcPhaseStatus(progressSource, phaseMeta);
    const due =
      fase.planned_end ||
      phaseTasks.map((t) => t.dueDate).filter(Boolean).sort().slice(-1)[0] ||
      null;

    return {
      id: fase.id,
      key: fase.phase || NARRATIVA_PHASES[idx]?.key,
      label: fase.name,
      order: fase.order || idx + 1,
      required: phaseMeta.required,
      gatekeeper,
      gate_status,
      sla_dias: fase.sla_dias ?? null,
      sla_prometido_dias: fase.sla_prometido_dias ?? null,
      planned_start: fase.planned_start || null,
      planned_end: fase.planned_end || null,
      dueDate: due,
      sla: slaTone(due),
      status,
      progress_pct: progress.progress_pct,
      progress_label:
        progress.total > 0 ? `${progress.done}/${progress.total}` : '0/0',
      tasks: phaseTasks,
      subtarefas: childTasks,
      can_transition: canTransitionPhase(progressSource, phaseMeta).ok,
    };
  });
}

/**
 * Gera tarefas embutidas no CyclePlan (formato legado + subtarefas).
 */
export function generateNarrativaCycleTasks(briefData = {}, dataInicio, template = null) {
  const source = template || CICLO_NARRATIVA_7_FASES_TEMPLATE;
  const deliverables = normalizeDeliverableTaskShapes(source.deliverables || []);
  const flat = flattenTaskTemplates(deliverables);
  const descricao = briefData.descricao || briefData.objetivo_mes || '';
  const tarefas = [];
  const byId = new Map();

  // Datas por fase (ordem sequencial em dias úteis aproximados)
  let cursor = String(dataInicio).slice(0, 10);
  const phaseStart = new Map();
  for (const fase of deliverables) {
    phaseStart.set(fase.id, cursor);
    const days = Number(fase.duration_business_days || fase.sla_dias || 3);
    cursor = addDays(cursor, days);
  }

  for (const tarefa of flat) {
    const start = phaseStart.get(tarefa.deliverableId) || dataInicio;
    const duracao = Number(tarefa.duracao_dias ?? 1);
    const hasBlocker = Boolean(tarefa.bloqueador);
    const row = {
      id: tarefa.id,
      semana: deliverables.findIndex((d) => d.id === tarefa.deliverableId) + 1,
      tipo: String(
        deliverables.find((d) => d.id === tarefa.deliverableId)?.name || ''
      ).toUpperCase(),
      phase: tarefa.phase || null,
      deliverableId: tarefa.deliverableId,
      titulo: tarefa.title || tarefa.titulo,
      descricao:
        tarefa.id === 'revisar_conceito_cliente' && descricao
          ? descricao
          : tarefa.description || tarefa.descricao || '',
      responsavel: tarefa.responsavel || 'bruna',
      gatekeeper: tarefa.gatekeeper || tarefa.phaseMeta?.gatekeeper || null,
      gate_status: tarefa.gate_status || (tarefa.gatekeeper ? 'pendente' : null),
      data_inicio: start,
      data_vencimento: addDays(start, Math.max(0, duracao)),
      status: hasBlocker ? 'bloqueada' : 'aberta',
      bloqueador: tarefa.bloqueador || null,
      notificacao: tarefa.notificacao || null,
      parent_template_id: tarefa.parent_template_id || null,
      is_parent: Boolean(tarefa.is_parent),
      resultado: null,
      estimated_hours: tarefa.estimated_hours,
      type: tarefa.type,
      checklist: Array.isArray(tarefa.checklist)
        ? tarefa.checklist.map((c) => ({ ...c }))
        : [],
    };
    tarefas.push(row);
    byId.set(row.id, row);
  }

  // Anexa subtarefas nos pais para leitura fácil
  for (const t of tarefas) {
    if (t.is_parent) {
      t.subtarefas = tarefas.filter((s) => s.parent_template_id === t.id);
      const p = calcProgress(t.subtarefas);
      t.progress_pct = p.progress_pct;
      t.progress_label = `${p.done}/${p.total}`;
    }
  }

  return tarefas;
}

/**
 * Desbloqueia dependentes (mesmo contrato do taskScheduler legado).
 */
export function unlockDependents(tarefas, taskIdConcluida) {
  return (Array.isArray(tarefas) ? tarefas : []).map((t) => {
    if (t.bloqueador === taskIdConcluida && t.status === 'bloqueada') {
      return { ...t, status: 'aberta' };
    }
    return t;
  });
}

/**
 * Recalcula progress_pct dos pais após update de subtarefa.
 */
export function refreshParentProgress(tarefas) {
  const list = Array.isArray(tarefas) ? tarefas : [];
  return list.map((t) => {
    if (!t.is_parent) return t;
    const subs = list.filter((s) => s.parent_template_id === t.id);
    const p = calcProgress(subs);
    return {
      ...t,
      subtarefas: subs,
      progress_pct: p.progress_pct,
      progress_label: `${p.done}/${p.total}`,
      status: p.progress_pct >= 100 ? 'concluida' : t.status === 'bloqueada' ? 'bloqueada' : 'aberta',
    };
  });
}

export function isNarrativaPipeline(serviceOrTemplate) {
  if (!serviceOrTemplate) return false;
  return (
    serviceOrTemplate.pipeline === 'narrativa' ||
    serviceOrTemplate.offering_key === 'ciclo_narrativa_7_fases' ||
    serviceOrTemplate.slug === 'ciclo_narrativa_7_fases' ||
    (Array.isArray(serviceOrTemplate.deliverables) &&
      serviceOrTemplate.deliverables.some(
        (d) => d?.phase === 'foto_e_video' || d?.phase === 'calendario_cliente'
      ))
  );
}

export default {
  calcProgress,
  calcPhaseStatus,
  canTransitionPhase,
  slaTone,
  buildPipelineView,
  generateNarrativaCycleTasks,
  unlockDependents,
  refreshParentProgress,
  isNarrativaPipeline,
};

/**
 * Priorização da Home (pós-V2.6):
 * trabalho classificado no foco da fase sobe na fila de atenção.
 *
 * Não cria SLA, alertas nem backfill.
 * Overdue continua acima do foco da fase.
 */

/** @type {Record<string, number>} */
export const ATTENTION_KIND_RANK = Object.freeze({
  overdue: 0,
  phase_focus: 1,
  blocked: 2,
  waiting_client: 3,
  approval: 4,
});

/**
 * Chave de dedupe: mesma Task não aparece duas vezes;
 * checklist items têm identidade própria.
 * @param {{ id?: string, kind?: string, taskId?: string, checklistItemId?: string }} item
 */
export function attentionItemDedupeKey(item) {
  if (!item) return '';
  if (item.kind === 'approval') return String(item.id || '');
  if (item.checklistItemId && item.taskId) {
    return `checklist:${item.taskId}:${item.checklistItemId}`;
  }
  if (item.taskId) return `task:${item.taskId}`;
  return String(item.id || '');
}

/**
 * Mescla fila de atenção com itens do foco da fase.
 * Em conflito na mesma chave, fica o kind de menor rank (mais urgente).
 *
 * @param {object[]} attentionQueue
 * @param {object[]} phaseFocusItems
 * @param {{ max?: number }} [options]
 */
export function mergePhaseFocusIntoAttentionQueue(
  attentionQueue,
  phaseFocusItems,
  options = {}
) {
  const max = Number.isFinite(options.max) ? options.max : 8;
  const combined = [
    ...(Array.isArray(attentionQueue) ? attentionQueue : []),
    ...(Array.isArray(phaseFocusItems) ? phaseFocusItems : []),
  ];

  /** @type {Map<string, object>} */
  const byKey = new Map();

  for (const item of combined) {
    if (!item) continue;
    const key = attentionItemDedupeKey(item);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    const prevRank = ATTENTION_KIND_RANK[prev.kind] ?? 9;
    const nextRank = ATTENTION_KIND_RANK[item.kind] ?? 9;
    if (nextRank < prevRank) {
      byKey.set(key, item);
      continue;
    }
    if (nextRank === prevRank) {
      const prevSort = Number(prev.sortAt) || Number.MAX_SAFE_INTEGER;
      const nextSort = Number(item.sortAt) || Number.MAX_SAFE_INTEGER;
      if (nextSort < prevSort) byKey.set(key, item);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => {
      const rank =
        (ATTENTION_KIND_RANK[a.kind] ?? 9) - (ATTENTION_KIND_RANK[b.kind] ?? 9);
      if (rank !== 0) return rank;
      return (Number(a.sortAt) || 0) - (Number(b.sortAt) || 0);
    })
    .slice(0, Math.max(0, max));
}

/**
 * Monta itens de fila a partir de phaseWork (só abertos).
 *
 * @param {object | null | undefined} phaseWork — retorno de resolveOperationalPhaseWork
 * @param {{
 *   tasks?: object[],
 *   clients?: object[],
 *   todayStart?: Date,
 *   resolveClientName?: (clients: object[], clientId: string) => string | null,
 *   formatDueLabel?: (due: Date | null, todayStart: Date) => string | null,
 *   parseDueDate?: (value: unknown) => Date | null,
 * }} [ctx]
 */
export function buildPhaseFocusAttentionItems(phaseWork, ctx = {}) {
  if (!phaseWork?.enabled || !Array.isArray(phaseWork.items)) return [];

  const tasks = Array.isArray(ctx.tasks) ? ctx.tasks : [];
  const clients = Array.isArray(ctx.clients) ? ctx.clients : [];
  const todayStart = ctx.todayStart || new Date();
  const resolveClientName = ctx.resolveClientName || (() => null);
  const formatDueLabel = ctx.formatDueLabel || (() => null);
  const parseDueDate =
    ctx.parseDueDate ||
    ((value) => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    });

  const taskById = new Map(tasks.filter((t) => t?.id).map((t) => [t.id, t]));
  const phaseLabel = phaseWork.phaseLabel || 'Fase';

  const open = phaseWork.items.filter((u) => u && !u.done);
  /** Preferir a lista completa se phaseWork truncou items — usar open count via items only */

  return open.map((unit) => {
    const task = unit.taskId ? taskById.get(unit.taskId) : null;
    const due = parseDueDate(task?.dueDate);
    const isChecklist = unit.source === 'checklist';

    return {
      id: unit.id,
      taskId: unit.taskId,
      checklistItemId: unit.checklistItemId || null,
      task: task || null,
      kind: 'phase_focus',
      title: unit.title,
      clientName: resolveClientName(clients, unit.clientId || task?.clientId),
      dueLabel: formatDueLabel(due, todayStart),
      priority: String(task?.priority || 'medium').toLowerCase(),
      sortAt: due ? due.getTime() : Number.MAX_SAFE_INTEGER,
      activityKind: unit.activityKind,
      activityKindLabel: unit.activityKindLabel,
      phaseLabel,
      /** Checklist: só abre a Task — não marcar unit inteira como done pela Home */
      completable: !isChecklist,
      source: unit.source,
    };
  });
}

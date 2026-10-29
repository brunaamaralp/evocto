/**
 * Normaliza campos de tarefa vindos da IA (EN camelCase, PT ou snake_case).
 */

function asString(v) {
  return String(v ?? '').trim();
}

function pickString(raw, keys) {
  for (const k of keys) {
    const v = asString(raw?.[k]);
    if (v) return v;
  }
  return '';
}

export function normalizeAiTaskPriority(raw = {}) {
  const p = asString(raw.priority || raw.prioridade).toLowerCase();
  if (['urgent', 'urgente'].includes(p)) return 'urgent';
  if (['high', 'alta', 'alto'].includes(p)) return 'high';
  if (['low', 'baixa', 'baixo'].includes(p)) return 'low';
  if (['medium', 'media', 'média', 'medio', 'médio'].includes(p)) return 'medium';
  return p || 'medium';
}

/**
 * @param {object} raw
 * @returns {{
 *   title: string,
 *   description: string,
 *   priority: string,
 *   phase: string,
 *   estimatedHours: number,
 *   dependencies: string[],
 *   kpiImpact: string,
 *   learningPotential: boolean,
 *   clientApprovalRequired: boolean,
 * }}
 */
export function normalizeAiTaskFields(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const hoursRaw =
    src.estimatedHours ??
    src.estimated_hours ??
    src.horas_estimadas ??
    src.horas;
  const hours = Number(hoursRaw);

  const deps = src.dependencies || src.dependencias || [];
  const kpi = asString(src.kpiImpact || src.kpi_impact || src.impacto_kpi).toLowerCase();

  return {
    title: pickString(src, ['title', 'titulo', 'título', 'name', 'nome']),
    description: pickString(src, [
      'description',
      'descricao',
      'descrição',
      'desc',
    ]),
    priority: normalizeAiTaskPriority(src),
    phase: pickString(src, ['phase', 'fase', 'etapa']) || 'Execução',
    estimatedHours:
      Number.isFinite(hours) && hours > 0 ? hours : 4,
    dependencies: Array.isArray(deps)
      ? deps.map((d) => asString(d)).filter(Boolean)
      : [],
    kpiImpact: ['low', 'medium', 'high'].includes(kpi) ? kpi : 'medium',
    learningPotential: Boolean(
      src.learningPotential ?? src.learning_potential ?? src.potencial_aprendizado
    ),
    clientApprovalRequired: Boolean(
      src.clientApprovalRequired ??
        src.client_approval_required ??
        src.aprovacao_cliente
    ),
  };
}

/**
 * Resolve payload de ADD_TASK: nested `{ task }` ou flat (legado).
 * @returns {ReturnType<typeof normalizeAiTaskFields> | null}
 */
export function resolveAddTaskPayload(payload = {}) {
  const p = payload && typeof payload === 'object' ? payload : {};
  if (p.task && typeof p.task === 'object') {
    const n = normalizeAiTaskFields(p.task);
    return n.title ? n : null;
  }
  if (p.title || p.titulo || p.título || p.name || p.nome) {
    const n = normalizeAiTaskFields(p);
    return n.title ? n : null;
  }
  return null;
}

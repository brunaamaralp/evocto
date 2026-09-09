import { getWeekRange } from '@/lib/taskFilterPresets';

const OPEN = new Set(['backlog', 'todo', 'in_progress', 'in_review', 'blocked']);

function statusLabel(status) {
  const map = {
    backlog: 'backlog',
    todo: 'a fazer',
    in_progress: 'em progresso',
    in_review: 'em revisão',
    completed: 'concluídas',
    blocked: 'bloqueadas',
    cancelled: 'canceladas',
  };
  return map[status] || status;
}

function weekLabelForDeliverable(d, index) {
  if (d?.description && /semana\s*\d/i.test(d.description)) {
    const m = String(d.description).match(/semana\s*(\d)/i);
    if (m) return `Semana ${m[1]}`;
  }
  if (d?.phase) return String(d.phase).toUpperCase();
  return `Semana ${index + 1}`;
}

/**
 * Monta texto pronto para WhatsApp/e-mail com status da semana/ciclo.
 */
export function buildDeliveryWeeklyStatusCopy({
  service,
  client,
  tasks = [],
  now = new Date(),
} = {}) {
  const clientName = client?.name || client?.company_name || service?.clientName || 'Cliente';
  const serviceName = service?.name || 'Serviço';
  const deliverables = Array.isArray(service?.deliverables) ? service.deliverables : [];
  const { start, end } = getWeekRange(now);

  const weekTasks = tasks.filter((t) => {
    if (!t?.dueDate) return false;
    const due = String(t.dueDate).slice(0, 10);
    return due >= start && due <= end;
  });

  const scope = weekTasks.length > 0 ? weekTasks : tasks;
  const scopeLabel = weekTasks.length > 0 ? 'esta semana' : 'no ciclo';

  const byStatus = {};
  for (const t of scope) {
    const s = t.status || 'todo';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  const completed = byStatus.completed || 0;
  const inReview = byStatus.in_review || 0;
  const inProgress = byStatus.in_progress || 0;
  const open = scope.filter((t) => OPEN.has(t.status)).length;

  const lines = [];
  lines.push(`📋 *Status — ${clientName}*`);
  lines.push(`${serviceName}`);
  lines.push('');
  lines.push(
    weekTasks.length > 0
      ? `📅 Semana ${start.slice(5)} → ${end.slice(5)}`
      : '📅 Visão do ciclo atual'
  );
  lines.push('');

  if (deliverables.length > 0) {
    lines.push('*Fases:*');
    deliverables.forEach((d, i) => {
      const stageTasks = tasks.filter((t) => String(t.deliverableId) === String(d.id));
      const done = stageTasks.filter((t) => t.status === 'completed').length;
      const total = stageTasks.length;
      const week = weekLabelForDeliverable(d, i);
      const st = (d.status || 'not_started').replace(/_/g, ' ');
      lines.push(
        `• ${week} — ${d.name}: ${done}/${total || 0} tarefas · ${st}`
      );
    });
    lines.push('');
  }

  lines.push(`*Resumo ${scopeLabel}:*`);
  lines.push(`• ${completed} concluídas`);
  if (inReview) lines.push(`• ${inReview} em revisão`);
  if (inProgress) lines.push(`• ${inProgress} em progresso`);
  lines.push(`• ${open} abertas no total`);

  const nextItems = scope
    .filter((t) => OPEN.has(t.status))
    .slice(0, 4)
    .map((t) => t.title);

  if (nextItems.length > 0) {
    lines.push('');
    lines.push('*Próximos:*');
    nextItems.forEach((title) => lines.push(`• ${title}`));
  }

  const statusBits = Object.entries(byStatus)
    .map(([s, n]) => `${n} ${statusLabel(s)}`)
    .join(', ');
  if (statusBits) {
    lines.push('');
    lines.push(`Detalhe: ${statusBits}`);
  }

  return lines.join('\n');
}

export default buildDeliveryWeeklyStatusCopy;

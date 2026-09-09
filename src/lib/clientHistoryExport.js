import { getTaskAssigneeId } from '@/lib/taskFilterPresets';

/**
 * Extrai entradas de decisão/histórico a partir de tarefas do cliente.
 */
export function collectClientHistoryEntries(tasks = []) {
  const entries = [];

  for (const task of Array.isArray(tasks) ? tasks : []) {
    const title = task.title || 'Tarefa';

    for (const h of task.statusHistory || []) {
      const ts = h.changedAt || task.updated_date || task.created_date;
      const d = ts ? new Date(ts) : null;
      const monthKey = d
        ? d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : 'Sem data';
      const text =
        h.type === 'assignment'
          ? `${title}: ${h.reason || 'responsável alterado'}`
          : `${title}: status ${h.previousStatus || '?'} → ${h.status || '?'}${
              h.reason ? ` (${h.reason})` : ''
            }`;
      entries.push({
        monthKey,
        dateLabel: d ? d.toLocaleDateString('pt-BR') : '',
        actor: h.changedByName || 'Sistema',
        text,
        timestamp: ts || '',
      });
    }

    for (const c of task.comments || []) {
      if (c.type === 'system') continue;
      const ts = c.createdAt || c.created_date;
      const d = ts ? new Date(ts) : null;
      const monthKey = d
        ? d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : 'Sem data';
      entries.push({
        monthKey,
        dateLabel: d ? d.toLocaleDateString('pt-BR') : '',
        actor: c.userName || c.userEmail || 'Usuário',
        text: `${title}: ${c.content || ''}`,
        timestamp: ts || '',
      });
    }
  }

  return entries.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function clientHistoryToMarkdown(clientName, entries) {
  const lines = [`# Histórico de decisões — ${clientName}`, ''];
  let currentMonth = null;
  for (const e of entries) {
    if (e.monthKey !== currentMonth) {
      currentMonth = e.monthKey;
      lines.push(`## ${currentMonth}`, '');
    }
    lines.push(`- **${e.dateLabel || '—'}** · ${e.actor}: ${e.text}`);
  }
  if (entries.length === 0) lines.push('_Nenhum registro._');
  return lines.join('\n');
}

export { getTaskAssigneeId };

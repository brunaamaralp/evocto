/**
 * Projetos recentes da equipe — projetos ordenados pela última atividade
 * registrada (tarefas, briefings, ciclos). Usado como acesso rápido na home.
 *
 * Registros ainda sem projectId (antes da migração) caem no card do cliente.
 */
import { isLegacyClientProjectId } from './projects/projectModel.js';

function toTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function lastHistoryEntry(task) {
  const history = Array.isArray(task?.statusHistory) ? task.statusHistory : [];
  let latest = null;
  for (const entry of history) {
    if (!entry) continue;
    if (!latest || toTime(entry.changedAt) >= toTime(latest.changedAt)) latest = entry;
  }
  return latest;
}

function cleanName(name) {
  const value = String(name || '').trim();
  if (!value || value === 'Sistema') return null;
  return value;
}

function taskActivity(task) {
  const history = lastHistoryEntry(task);
  const historyAt = toTime(history?.changedAt);
  const at = Math.max(toTime(task.updated_date), toTime(task.completedAt), historyAt);
  const status = String(task.status || '').toLowerCase();
  const completed = status === 'completed' || status === 'done';
  const actorName =
    cleanName(history?.changedByName) ||
    cleanName(task.assigneeName) ||
    cleanName(task.assignedToName) ||
    null;
  return {
    at,
    label: task.title || 'Tarefa',
    verb: completed ? 'Concluída' : 'Tarefa',
    actorName,
  };
}

/**
 * Formata "há X" em pt-BR.
 * @param {number} at timestamp (ms)
 * @param {number} [now]
 */
export function formatRelativeActivity(at, now = Date.now()) {
  if (!at) return null;
  const diff = Math.max(0, now - at);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ontem';
  if (d < 7) return `há ${d} dias`;
  return new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * @param {object} params
 * @param {Array} params.clients
 * @param {Array} [params.projects]
 * @param {Array} [params.tasks]
 * @param {Array} [params.briefs]
 * @param {Array} [params.cycles]
 * @param {number} [params.max]
 * @param {number} [params.windowDays] ignora atividade mais antiga que isso
 * @param {Date|number} [params.now]
 * @param {(clientId: string) => string} params.createClientHref
 * @param {(projectId: string) => string} [params.createProjectHref]
 */
export function buildRecentTeamProjects({
  clients = [],
  projects = [],
  tasks = [],
  briefs = [],
  cycles = [],
  max = 6,
  windowDays = 30,
  now = Date.now(),
  createClientHref,
  createProjectHref,
}) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now) || Date.now();
  const minAt = windowDays > 0 ? nowMs - windowDays * 86400000 : 0;
  const byClient = new Map();
  for (const c of clients) {
    if (c?.id) byClient.set(String(c.id), c);
  }

  const byProject = new Map();
  for (const p of projects) {
    if (p?.id) byProject.set(String(p.id), p);
  }

  /** @type {Map<string, { projectId: string|null, clientId: string|null, at: number, label: string, verb: string, actorName: string|null, actors: Set<string>, count: number }>} */
  const acc = new Map();

  const push = (record, activity) => {
    if (!activity.at || activity.at < minAt) return;
    const rawProjectId =
      record?.projectId && !isLegacyClientProjectId(record) ? String(record.projectId) : null;
    const project = rawProjectId ? byProject.get(rawProjectId) : null;
    if (project && project.status === 'arquivado') return;
    const clientId = record?.clientId
      ? String(record.clientId)
      : project?.clientId
        ? String(project.clientId)
        : null;
    if (!project && (!clientId || !byClient.has(clientId))) return;
    if (project && clientId && !byClient.has(clientId)) return; // cliente arquivado
    const key = project ? `project:${project.id}` : `client:${clientId}`;
    let row = acc.get(key);
    if (!row) {
      row = {
        projectId: project ? String(project.id) : null,
        clientId,
        at: 0,
        label: '',
        verb: '',
        actorName: null,
        actors: new Set(),
        count: 0,
      };
      acc.set(key, row);
    }
    row.count += 1;
    if (activity.actorName) row.actors.add(activity.actorName);
    if (activity.at > row.at) {
      row.at = activity.at;
      row.label = activity.label;
      row.verb = activity.verb;
      row.actorName = activity.actorName;
    }
  };

  for (const task of tasks) {
    if (!task) continue;
    push(task, taskActivity(task));
  }
  for (const brief of briefs) {
    if (!brief) continue;
    push(brief, {
      at: toTime(brief.updated_date),
      label: brief.title || brief.name || 'Briefing',
      verb: 'Briefing',
      actorName: null,
    });
  }
  for (const cycle of cycles) {
    if (!cycle) continue;
    push(cycle, {
      at: toTime(cycle.updated_date),
      label: cycle.title || cycle.period || 'Planejamento',
      verb: 'Planejamento',
      actorName: null,
    });
  }

  return [...acc.entries()]
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, max)
    .map(([key, row]) => {
      const client = row.clientId ? byClient.get(row.clientId) : null;
      const project = row.projectId ? byProject.get(row.projectId) : null;
      const clientName = client?.name || (project && !project.clientId ? 'Interno' : 'Cliente');
      return {
        id: key,
        projectId: row.projectId,
        clientId: row.clientId,
        name: project?.name || clientName,
        clientName: project ? clientName : null,
        href: project
          ? createProjectHref
            ? createProjectHref(project.id)
            : null
          : createClientHref && row.clientId
            ? createClientHref(row.clientId)
            : null,
        lastActivityAt: row.at,
        lastActivityLabel: row.label,
        lastActivityVerb: row.verb,
        lastActorName: row.actorName,
        actors: [...row.actors].slice(0, 3),
        activityCount: row.count,
      };
    });
}

/**
 * Leitura / escrita de projetos para as telas.
 */
import { Project, Task, Service, CyclePlan, Brief, Client } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { PROJECT_STATUSES } from './projectModel.js';

async function safe(promise) {
  try {
    const result = await promise;
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.warn('[projects]', err?.message || err);
    return [];
  }
}

export function buildProjectHref(projectId) {
  return createPageUrl(`project-detail?projectId=${encodeURIComponent(projectId)}`);
}

const STATUS_RANK = { ativo: 0, pausado: 1, concluido: 2, arquivado: 3 };

export function sortProjects(projects = []) {
  return [...projects].sort((a, b) => {
    const r = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
    if (r !== 0) return r;
    if (Boolean(a.isDefault) !== Boolean(b.isDefault)) return a.isDefault ? 1 : -1;
    return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
  });
}

/** Projetos de um cliente (clientId null → projetos internos da agência). */
export async function listClientProjects({ agencyId, clientId }) {
  const filters = { agencyId };
  if (clientId) filters.clientId = String(clientId);
  const rows = await safe(Project.filter(filters, '-updated_date', 200));
  const scoped = clientId ? rows : rows.filter((p) => !p.clientId);
  return sortProjects(scoped);
}

export async function listAgencyProjects(agencyId) {
  return sortProjects(await safe(Project.filter({ agencyId }, '-updated_date', 500)));
}

export async function createProject({ agencyId, clientId, name, status = 'ativo', description = '' }) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Dê um nome ao projeto.');
  return Project.create({
    agencyId,
    clientId: clientId || null,
    name: trimmed,
    status: PROJECT_STATUSES.includes(status) ? status : 'ativo',
    kind: clientId ? 'custom' : 'internal',
    serviceId: null,
    isDefault: false,
    description,
  });
}

export async function updateProject(projectId, patch) {
  return Project.update(projectId, patch);
}

/** Tudo que pertence ao projeto, para a página do projeto. */
export async function loadProjectBundle({ agencyId, projectId }) {
  const project = await Project.get(projectId);
  const scoped = { agencyId, projectId: String(projectId) };
  const [tasks, services, cycles, briefs, client] = await Promise.all([
    safe(Task.filter(scoped, '-updated_date', 1000)),
    safe(Service.filter(scoped)),
    safe(CyclePlan.filter(scoped)),
    safe(Brief.filter(scoped)),
    project?.clientId ? Client.get(project.clientId).catch(() => null) : Promise.resolve(null),
  ]);
  return { project, client, tasks, services, cycles, briefs };
}

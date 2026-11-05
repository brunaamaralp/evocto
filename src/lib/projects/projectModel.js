/**
 * Modelo de Projeto — Cliente → Projeto → (Serviço, Ciclo, Campanha, Tarefa → Subtarefa).
 *
 * Módulo PURO (sem imports com alias) para ser usado tanto no front quanto
 * nos scripts Node de migração.
 *
 * Atenção ao legado: em briefs (e learning_entries) o campo `projectId`
 * historicamente guardava o **clientId**. `isLegacyClientProjectId` detecta isso.
 */

export const PROJECT_STATUSES = ['ativo', 'pausado', 'concluido', 'arquivado'];

export const PROJECT_STATUS_LABELS = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
};

/** service: nasceu de um serviço contratado; general: "Geral" do cliente; internal: trabalho interno da agência */
export const PROJECT_KINDS = ['service', 'campaign', 'general', 'internal', 'custom'];

export const DEFAULT_PROJECT_NAME = 'Geral';
export const INTERNAL_PROJECT_NAME = 'Interno da agência';

/** Tabelas cujos registros pertencem a um projeto. */
export const PROJECT_SCOPED_TABLES = ['tasks', 'services', 'cycle_plans', 'briefs'];

const str = (v) => (v == null || v === '' ? null : String(v));

export function isLegacyClientProjectId(record) {
  if (!record?.projectId || !record?.clientId) return false;
  return String(record.projectId) === String(record.clientId);
}

export function getRecordCycleId(record) {
  return str(record?.cyclePlanId || record?.cycleId || record?.ciclo_id);
}

export function getRecordBriefId(record) {
  return str(record?.briefingId || record?.briefId || record?.campanhaId || record?.campaignId);
}

export function getCycleBriefId(cycle) {
  return str(
    cycle?.briefId || cycle?.briefingId || cycle?.planData?.briefId || cycle?.planData?.briefingId
  );
}

export function isTemplateService(service) {
  return service?.is_template === true;
}

export function projectStatusFromService(service) {
  const status = String(service?.status || '').toLowerCase();
  if (['concluido', 'concluído', 'completed', 'done', 'finalizado', 'encerrado'].includes(status)) {
    return 'concluido';
  }
  if (['arquivado', 'archived', 'cancelado', 'cancelled'].includes(status)) return 'arquivado';
  if (service?.is_active === false || ['pausado', 'paused', 'inativo'].includes(status)) {
    return 'pausado';
  }
  return 'ativo';
}

export function buildServiceProjectData(service) {
  return {
    agencyId: service.agencyId || null,
    clientId: str(service.clientId),
    name: service.name || 'Projeto',
    status: projectStatusFromService(service),
    kind: 'service',
    serviceId: str(service.id),
    isDefault: false,
  };
}

export function buildDefaultProjectData({ agencyId, clientId }) {
  if (!clientId) {
    return {
      agencyId: agencyId || null,
      clientId: null,
      name: INTERNAL_PROJECT_NAME,
      status: 'ativo',
      kind: 'internal',
      serviceId: null,
      isDefault: true,
    };
  }
  return {
    agencyId: agencyId || null,
    clientId: String(clientId),
    name: DEFAULT_PROJECT_NAME,
    status: 'ativo',
    kind: 'general',
    serviceId: null,
    isDefault: true,
  };
}

export function defaultProjectKey(clientId) {
  return clientId ? `client:${clientId}` : 'internal';
}

/**
 * Plano de migração (puro). Não grava nada; devolve o que criar/atualizar.
 *
 * @param {object} input
 * @param {string} input.agencyId
 * @param {Array} [input.clients]
 * @param {Array} [input.projects] projetos já existentes
 * @param {Array} [input.services]
 * @param {Array} [input.cycles]
 * @param {Array} [input.briefs]
 * @param {Array} [input.tasks]
 * @param {() => string} input.idFactory gera ids para projetos novos
 */
export function planProjectMigration({
  agencyId,
  clients = [],
  projects = [],
  services = [],
  cycles = [],
  briefs = [],
  tasks = [],
  idFactory,
}) {
  if (typeof idFactory !== 'function') throw new Error('idFactory é obrigatório');

  const clientIds = new Set(clients.map((c) => String(c.id)));
  const knownProjects = new Map(projects.map((p) => [String(p.id), p]));
  const projectByServiceId = new Map();
  const defaultByKey = new Map();
  for (const p of projects) {
    if (p.serviceId) projectByServiceId.set(String(p.serviceId), String(p.id));
    if (p.isDefault) defaultByKey.set(defaultProjectKey(p.clientId), String(p.id));
  }

  const createProjects = [];
  const addProject = (data) => {
    const id = idFactory();
    const row = { id, ...data, agencyId: data.agencyId || agencyId };
    createProjects.push(row);
    knownProjects.set(id, row);
    return id;
  };

  const ensureDefault = (clientId) => {
    const cid = clientId && clientIds.has(String(clientId)) ? String(clientId) : null;
    const key = defaultProjectKey(cid);
    if (defaultByKey.has(key)) return defaultByKey.get(key);
    const id = addProject(buildDefaultProjectData({ agencyId, clientId: cid }));
    defaultByKey.set(key, id);
    return id;
  };

  const validProjectId = (value) => {
    const id = str(value);
    return id && knownProjects.has(id) ? id : null;
  };

  const updates = { services: [], cycle_plans: [], briefs: [], tasks: [] };
  const pushUpdate = (table, record, patch) => {
    const changed = Object.entries(patch).some(
      ([k, v]) => str(record[k]) !== str(v)
    );
    if (changed) updates[table].push({ id: String(record.id), ...patch });
  };

  // 1) Serviços → projeto próprio
  const serviceProject = new Map();
  for (const service of services) {
    if (isTemplateService(service)) continue;
    const sid = String(service.id);
    let pid = validProjectId(service.projectId) || projectByServiceId.get(sid) || null;
    if (!pid) {
      if (service.clientId && clientIds.has(String(service.clientId))) {
        pid = addProject({ ...buildServiceProjectData(service), agencyId });
        projectByServiceId.set(sid, pid);
      } else {
        pid = ensureDefault(null);
      }
    }
    serviceProject.set(sid, pid);
    pushUpdate('services', service, { projectId: pid });
  }

  const byServiceOrDefault = (record) => {
    const sid = str(record.serviceId);
    if (sid && serviceProject.has(sid)) return serviceProject.get(sid);
    return ensureDefault(record.clientId);
  };

  // 2) Ciclos
  const cycleProject = new Map();
  for (const cycle of cycles) {
    const pid = validProjectId(cycle.projectId) || byServiceOrDefault(cycle);
    cycleProject.set(String(cycle.id), pid);
    pushUpdate('cycle_plans', cycle, { projectId: pid });
  }

  // 3) Briefings / campanhas (corrige projectId legado = clientId)
  const cycleByBriefId = new Map();
  for (const cycle of cycles) {
    const bid = getCycleBriefId(cycle);
    if (bid) cycleByBriefId.set(bid, String(cycle.id));
  }
  const briefProject = new Map();
  for (const brief of briefs) {
    const legacy = isLegacyClientProjectId(brief);
    let clientId = str(brief.clientId);
    if (!clientId && brief.projectId && clientIds.has(String(brief.projectId))) {
      clientId = String(brief.projectId); // projectId legado era o cliente
    }
    const fromCycle =
      cycleProject.get(getRecordCycleId(brief) || '') ||
      cycleProject.get(cycleByBriefId.get(String(brief.id)) || '');
    const pid =
      (!legacy && validProjectId(brief.projectId)) ||
      fromCycle ||
      byServiceOrDefault({ ...brief, clientId });
    briefProject.set(String(brief.id), pid);
    pushUpdate('briefs', brief, clientId ? { clientId, projectId: pid } : { projectId: pid });
  }

  // 4) Tarefas — mães primeiro, subtarefas herdam da mãe
  const taskProject = new Map();
  const resolveTask = (task) => {
    const own = validProjectId(task.projectId);
    if (own) return own;
    return (
      cycleProject.get(getRecordCycleId(task) || '') ||
      briefProject.get(getRecordBriefId(task) || '') ||
      byServiceOrDefault(task)
    );
  };
  const roots = tasks.filter((t) => !t.parentTaskId);
  const children = tasks.filter((t) => t.parentTaskId);
  for (const task of roots) {
    const pid = resolveTask(task);
    taskProject.set(String(task.id), pid);
    pushUpdate('tasks', task, { projectId: pid });
  }
  for (const task of children) {
    const pid = taskProject.get(String(task.parentTaskId)) || resolveTask(task);
    taskProject.set(String(task.id), pid);
    pushUpdate('tasks', task, { projectId: pid });
  }

  return {
    createProjects,
    updates,
    stats: {
      projectsToCreate: createProjects.length,
      services: updates.services.length,
      cycle_plans: updates.cycle_plans.length,
      briefs: updates.briefs.length,
      tasks: updates.tasks.length,
    },
  };
}

/**
 * Árvore tarefa → subtarefas (para a página do projeto).
 * Subtarefa cuja mãe não está na lista vira raiz.
 */
export function buildTaskTree(tasks = []) {
  const byId = new Map(tasks.map((t) => [String(t.id), { ...t, subtasks: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parentTaskId ? byId.get(String(node.parentTaskId)) : null;
    if (parent && parent !== node) parent.subtasks.push(node);
    else roots.push(node);
  }
  return roots;
}

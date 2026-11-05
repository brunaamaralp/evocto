/**
 * Garante `projectId` em toda escrita de tasks / services / cycle_plans / briefs.
 *
 * Registrado como hook do entityAdapter (ver src/api/entities.js), então todos os
 * fluxos que já criam tarefas (templates de ciclo, modal, IA, importação…) passam
 * a gravar projeto sem precisar mudar cada tela.
 *
 * Ordem de resolução de uma tarefa sem projectId:
 *   tarefa-mãe → ciclo → campanha/briefing → serviço → projeto "Geral" do cliente
 *   → (sem cliente) projeto "Interno da agência".
 *
 * Importa entidades sob demanda para não criar import circular com entities.js.
 */
import {
  buildDefaultProjectData,
  buildServiceProjectData,
  defaultProjectKey,
  getRecordBriefId,
  getRecordCycleId,
  isLegacyClientProjectId,
  isTemplateService,
} from './projectModel.js';

const CACHE_TTL_MS = 60_000;
const lookupCache = new Map();
const defaultProjectPromises = new Map();

let entitiesPromise = null;
function loadEntities() {
  if (!entitiesPromise) entitiesPromise = import('@/api/entities');
  return entitiesPromise;
}

async function cachedGet(entityName, id) {
  if (!id) return null;
  const key = `${entityName}:${id}`;
  const hit = lookupCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const entities = await loadEntities();
  let value = null;
  try {
    value = await entities[entityName].get(String(id));
  } catch {
    value = null;
  }
  lookupCache.set(key, { at: Date.now(), value });
  return value;
}

export function rememberProjectLink(entityName, record) {
  if (!record?.id) return;
  lookupCache.set(`${entityName}:${record.id}`, { at: Date.now(), value: record });
}

export function clearProjectAssignmentCache() {
  lookupCache.clear();
  defaultProjectPromises.clear();
}

/** Projeto "Geral" do cliente (ou "Interno" da agência). Cria se não existir. */
export async function ensureDefaultProject({ agencyId, clientId }) {
  const key = `${agencyId || ''}|${defaultProjectKey(clientId)}`;
  if (defaultProjectPromises.has(key)) return defaultProjectPromises.get(key);

  const promise = (async () => {
    const { Project } = await loadEntities();
    const filters = { isDefault: true };
    if (agencyId) filters.agencyId = agencyId;
    if (clientId) filters.clientId = String(clientId);
    const found = (await Project.filter(filters, '-created_date', 20)).filter((p) =>
      clientId ? String(p.clientId) === String(clientId) : !p.clientId
    );
    if (found[0]?.id) return found[0];
    return Project.create(buildDefaultProjectData({ agencyId, clientId }));
  })();

  defaultProjectPromises.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    defaultProjectPromises.delete(key);
    throw err;
  }
}

function validId(record) {
  if (!record?.projectId) return null;
  if (isLegacyClientProjectId(record)) return null;
  return String(record.projectId);
}

async function projectFromLinks(record) {
  if (record.parentTaskId) {
    const parent = await cachedGet('Task', record.parentTaskId);
    if (parent?.projectId) return String(parent.projectId);
  }
  const cycleId = getRecordCycleId(record);
  if (cycleId) {
    const cycle = await cachedGet('CyclePlan', cycleId);
    if (cycle?.projectId) return String(cycle.projectId);
  }
  const briefId = getRecordBriefId(record);
  if (briefId) {
    const brief = await cachedGet('Brief', briefId);
    const pid = validId(brief);
    if (pid) return pid;
  }
  if (record.serviceId) {
    const service = await cachedGet('Service', record.serviceId);
    if (service?.projectId) return String(service.projectId);
  }
  return null;
}

/**
 * Resolve o projeto para um registro (sem gravar o registro).
 * @returns {Promise<string|null>}
 */
export async function resolveProjectIdFor(record = {}, { existing = null } = {}) {
  const own = validId(record);
  if (own) return own;
  const prev = validId(existing);
  if (prev) return prev;
  const linked = await projectFromLinks(record);
  if (linked) return linked;
  const project = await ensureDefaultProject({
    agencyId: record.agencyId || existing?.agencyId || null,
    clientId: record.clientId || existing?.clientId || null,
  });
  return project?.id ? String(project.id) : null;
}

/** Hook: antes de criar. Pode devolver { payload, after } */
async function beforeCreate(tableId, payload) {
  if (tableId === 'services') {
    if (isTemplateService(payload) || validId(payload) || !payload.clientId) {
      return { payload };
    }
    // Serviço contratado novo sem projeto → nasce um projeto com o nome do serviço
    const { Project } = await loadEntities();
    const project = await Project.create(
      buildServiceProjectData({ ...payload, id: null })
    );
    return {
      payload: { ...payload, projectId: project.id },
      after: async (created) => {
        if (!created?.id) return;
        try {
          await Project.update(project.id, { serviceId: String(created.id) });
        } catch (err) {
          console.warn('[projects] vincular serviço ao projeto falhou:', err?.message || err);
        }
        rememberProjectLink('Service', created);
      },
    };
  }

  if (tableId === 'tasks' || tableId === 'cycle_plans' || tableId === 'briefs') {
    const projectId = await resolveProjectIdFor(payload);
    if (!projectId && tableId === 'tasks') {
      throw new Error('Toda tarefa precisa pertencer a um projeto.');
    }
    const entityName =
      tableId === 'tasks' ? 'Task' : tableId === 'cycle_plans' ? 'CyclePlan' : 'Brief';
    return {
      payload: { ...payload, projectId },
      after: async (created) => rememberProjectLink(entityName, created),
    };
  }

  return { payload };
}

/** Hook: antes de atualizar (merged = existente + patch). */
async function beforeUpdate(tableId, merged, existing) {
  if (!['tasks', 'cycle_plans', 'briefs', 'services'].includes(tableId)) return merged;
  if (tableId === 'services' && isTemplateService(merged)) return merged;
  if (validId(merged)) return merged;
  // projectId ausente ou legado (= clientId): mantém o que já existia ou resolve.
  const prev = validId(existing);
  if (prev) return { ...merged, projectId: prev };
  if (tableId === 'services') return merged; // migração cuida dos serviços antigos
  try {
    const projectId = await resolveProjectIdFor(merged, { existing });
    return projectId ? { ...merged, projectId } : merged;
  } catch (err) {
    console.warn('[projects] resolver projeto no update falhou:', err?.message || err);
    return merged;
  }
}

export const projectWriteHooks = { beforeCreate, beforeUpdate };

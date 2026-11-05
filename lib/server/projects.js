/**
 * Projetos no servidor (API key). Espelha src/lib/projects/projectAssignment.js
 * para fluxos server-side que gravam briefs (briefing público, agente de campanha).
 */
import { ID, Permission, Query, Role } from 'node-appwrite';
import {
  buildDefaultProjectData,
  isLegacyClientProjectId,
} from '../../src/lib/projects/projectModel.js';

function teamPermissions(agencyId) {
  if (!agencyId) return undefined;
  return [
    Permission.read(Role.team(agencyId)),
    Permission.update(Role.team(agencyId)),
    Permission.delete(Role.team(agencyId)),
  ];
}

function splitProject(data) {
  const { agencyId, clientId, name, status, kind, serviceId, isDefault, ...rest } = data;
  return {
    agencyId,
    clientId,
    name,
    status,
    kind,
    serviceId,
    isDefault,
    payload: JSON.stringify(rest),
  };
}

/**
 * Adaptador mínimo: aceita TablesDB (`tables`) ou Databases legado (`databases`).
 */
function makeStore({ tables, databases, databaseId }) {
  if (tables) {
    return {
      async list(queries) {
        const res = await tables.listRows({ databaseId, tableId: 'projects', queries });
        return res.rows || res.documents || [];
      },
      async create(data, permissions) {
        return tables.createRow({
          databaseId,
          tableId: 'projects',
          rowId: ID.unique(),
          data,
          permissions,
        });
      },
    };
  }
  return {
    async list(queries) {
      const res = await databases.listDocuments(databaseId, 'projects', queries);
      return res.documents || [];
    },
    async create(data, permissions) {
      return databases.createDocument(databaseId, 'projects', ID.unique(), data, permissions);
    },
  };
}

/** @returns {Promise<string|null>} */
export async function ensureDefaultProjectIdServer(
  { tables, databases, databaseId },
  { agencyId, clientId }
) {
  const store = makeStore({ tables, databases, databaseId });
  try {
    const queries = [Query.equal('isDefault', true), Query.limit(5)];
    if (agencyId) queries.push(Query.equal('agencyId', agencyId));
    if (clientId) queries.push(Query.equal('clientId', String(clientId)));
    const rows = (await store.list(queries)).filter((r) =>
      clientId ? String(r.clientId) === String(clientId) : !r.clientId
    );
    if (rows[0]?.$id) return rows[0].$id;
    const created = await store.create(
      splitProject(buildDefaultProjectData({ agencyId, clientId })),
      teamPermissions(agencyId)
    );
    return created?.$id || null;
  } catch (err) {
    // Tabela projects ainda não provisionada: não bloqueia o briefing.
    console.warn('[projects] default project (server) falhou:', err?.message || err);
    return null;
  }
}

/**
 * projectId para gravar num brief: mantém o projeto real existente;
 * substitui o legado (= clientId) / vazio pelo projeto "Geral" do cliente.
 */
export async function resolveBriefProjectIdServer(ctx, { briefExisting, agencyId, clientId }) {
  if (briefExisting?.projectId && !isLegacyClientProjectId({ ...briefExisting, clientId })) {
    return String(briefExisting.projectId);
  }
  return ensureDefaultProjectIdServer(ctx, { agencyId, clientId });
}

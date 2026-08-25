import {
  getTablesDB,
  getAccount,
  DATABASE_ID,
  ID,
  Query,
  Permission,
  Role,
} from '@/api/appwriteClient';
import { TABLE_COLUMNS, BOOLEAN_COLUMNS, DATETIME_COLUMNS } from './tableMap';

const SYSTEM_KEYS = new Set([
  'id',
  '$id',
  '$createdAt',
  '$updatedAt',
  '$permissions',
  '$databaseId',
  '$tableId',
  '$collectionId',
  'created_date',
  'updated_date',
  'payload',
]);

function coerceValue(key, value) {
  if (value === undefined) return undefined;
  if (BOOLEAN_COLUMNS.has(key)) return Boolean(value);
  if (DATETIME_COLUMNS.has(key)) {
    if (!value) return undefined;
    return typeof value === 'string' ? value : new Date(value).toISOString();
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    return undefined;
  }
  return value;
}

function splitPayload(tableId, data = {}) {
  const known = new Set(TABLE_COLUMNS[tableId] || []);
  const row = {};
  const extra = {};

  for (const [key, value] of Object.entries(data)) {
    if (SYSTEM_KEYS.has(key) || value === undefined) continue;
    if (known.has(key)) {
      const coerced = coerceValue(key, value);
      if (coerced !== undefined) row[key] = coerced;
      else extra[key] = value;
    } else {
      extra[key] = value;
    }
  }

  if (Object.keys(extra).length > 0) {
    row.payload = JSON.stringify(extra);
  }

  return row;
}

function mergeRow(row) {
  if (!row) return null;
  let extra = {};
  if (row.payload) {
    try {
      extra = JSON.parse(row.payload);
    } catch {
      extra = {};
    }
  }

  const {
    payload,
    $id,
    $createdAt,
    $updatedAt,
    $permissions,
    $databaseId,
    $tableId,
    $collectionId,
    ...rest
  } = row;

  return {
    ...extra,
    ...rest,
    id: $id,
    created_date: $createdAt,
    updated_date: $updatedAt,
  };
}

async function rowPermissions(agencyId, extra = []) {
  const perms = [...extra];
  if (agencyId) {
    perms.push(
      Permission.read(Role.team(agencyId)),
      Permission.update(Role.team(agencyId)),
      Permission.delete(Role.team(agencyId)),
    );
    return perms;
  }
  try {
    const user = await getAccount().get();
    perms.push(
      Permission.read(Role.user(user.$id)),
      Permission.update(Role.user(user.$id)),
      Permission.delete(Role.user(user.$id)),
    );
  } catch {
    // anonymous create not supported in phase 1
  }
  return perms;
}

async function resolveAgencyId(data = {}) {
  if (data.agencyId) return data.agencyId;
  try {
    const account = getAccount();
    const user = await account.get();
    const tables = getTablesDB();
    const profile = await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: 'profiles',
      rowId: user.$id,
    });
    return profile.agencyId || null;
  } catch {
    return null;
  }
}

function mapOrder(order) {
  if (!order || typeof order !== 'string') return null;
  const desc = order.startsWith('-');
  const field = desc ? order.slice(1) : order;
  const mapped =
    field === 'updated_date' ? '$updatedAt' :
    field === 'created_date' ? '$createdAt' :
    field === 'date' ? '$createdAt' :
    field;
  return desc ? Query.orderDesc(mapped) : Query.orderAsc(mapped);
}

function isMongoOp(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).some((k) => k.startsWith('$'));
}

function toQueries(tableId, filters = {}, order, limit) {
  const known = new Set(TABLE_COLUMNS[tableId] || []);
  const queries = [];
  const clientFilters = {};

  for (const [key, value] of Object.entries(filters || {})) {
    if (value === undefined || value === null) continue;

    if (isMongoOp(value)) {
      if (value.$in && known.has(key)) {
        queries.push(Query.equal(key, value.$in));
      } else if (value.$in) {
        clientFilters[key] = value;
      } else if (value.$ne !== undefined && known.has(key)) {
        queries.push(Query.notEqual(key, value.$ne));
      } else {
        clientFilters[key] = value;
      }
      continue;
    }

    if (known.has(key)) {
      queries.push(Query.equal(key, coerceValue(key, value) ?? value));
    } else {
      clientFilters[key] = value;
    }
  }

  const orderQuery = mapOrder(order);
  if (orderQuery) queries.push(orderQuery);

  const pageSize = Math.min(Number(limit) || 100, 100);
  queries.push(Query.limit(pageSize));

  return { queries, clientFilters, pageSize };
}

function matchesClientFilters(row, clientFilters) {
  return Object.entries(clientFilters).every(([key, expected]) => {
    const actual = row[key];
    if (isMongoOp(expected) && expected.$in) {
      return expected.$in.includes(actual);
    }
    if (isMongoOp(expected) && expected.$ne !== undefined) {
      return actual !== expected.$ne;
    }
    return actual === expected;
  });
}

async function listAll(tableId, filters, order, limit) {
  const tables = getTablesDB();
  const { queries, clientFilters, pageSize } = toQueries(tableId, filters, order, limit);
  const max = Number(limit) || 500;
  const rows = [];
  let offset = 0;

  while (rows.length < max) {
    const result = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [...queries, Query.offset(offset)],
    });
    const documents = result.rows || result.documents || [];
    rows.push(...documents.map(mergeRow).filter((row) => matchesClientFilters(row, clientFilters)));
    if (documents.length < pageSize) break;
    offset += pageSize;
    if (offset >= 1000) break;
  }

  return rows.slice(0, max);
}

export function createEntityAdapter(tableId, { allowEmpty = false } = {}) {
  if (!tableId) {
    return {
      async create() {
        throw new Error('Entity not migrated yet');
      },
      async get() {
        if (allowEmpty) return null;
        throw new Error('Entity not migrated yet');
      },
      async update() {
        throw new Error('Entity not migrated yet');
      },
      async delete() {
        throw new Error('Entity not migrated yet');
      },
      async list() {
        if (allowEmpty) return [];
        throw new Error('Entity not migrated yet');
      },
      async filter() {
        if (allowEmpty) return [];
        throw new Error('Entity not migrated yet');
      },
    };
  }

  return {
    async create(data = {}) {
      const tables = getTablesDB();
      const agencyId = await resolveAgencyId(data);
      const row = splitPayload(tableId, { ...data, agencyId: data.agencyId || agencyId });
      const extraPerms = tableId === 'profiles' && data.id
        ? [Permission.read(Role.user(data.id)), Permission.update(Role.user(data.id))]
        : [];
      const created = await tables.createRow({
        databaseId: DATABASE_ID,
        tableId,
        rowId: data.id || ID.unique(),
        data: row,
        permissions: await rowPermissions(agencyId || data.agencyId, extraPerms),
      });
      return mergeRow(created);
    },

    async get(id) {
      const tables = getTablesDB();
      const row = await tables.getRow({
        databaseId: DATABASE_ID,
        tableId,
        rowId: id,
      });
      return mergeRow(row);
    },

    async update(id, data = {}) {
      const tables = getTablesDB();
      let existing = {};
      try {
        const current = await tables.getRow({ databaseId: DATABASE_ID, tableId, rowId: id });
        existing = mergeRow(current) || {};
      } catch {
        existing = {};
      }
      const merged = { ...existing, ...data, id };
      const row = splitPayload(tableId, merged);
      const updated = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId,
        rowId: id,
        data: row,
      });
      return mergeRow(updated);
    },

    async delete(id) {
      const tables = getTablesDB();
      await tables.deleteRow({
        databaseId: DATABASE_ID,
        tableId,
        rowId: id,
      });
      return { id };
    },

    async list(orderOrFilters, maybeLimit) {
      if (typeof orderOrFilters === 'string' || orderOrFilters == null) {
        return listAll(tableId, {}, orderOrFilters, maybeLimit);
      }
      return listAll(tableId, orderOrFilters, undefined, maybeLimit);
    },

    async filter(filters = {}, order, limit) {
      return listAll(tableId, filters, order, limit);
    },
  };
}

export function createStubEntity(entityName) {
  const message = `Entity ${entityName} not migrated yet`;
  return {
    async create() {
      throw new Error(message);
    },
    async get() {
      throw new Error(message);
    },
    async update() {
      throw new Error(message);
    },
    async delete() {
      throw new Error(message);
    },
    async list() {
      console.warn(`[Appwrite] ${message}`);
      return [];
    },
    async filter() {
      console.warn(`[Appwrite] ${message}`);
      return [];
    },
  };
}

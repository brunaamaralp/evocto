import { getAccount, getTablesDB, getTeams, DATABASE_ID, ID, Permission, Role } from '@/api/appwriteClient';
import { createEntityAdapter } from './entityAdapter';

function mapUser(account, profile = {}) {
  const agencyId = profile.agencyId || null;
  const clientId = profile.clientId || null;
  const fullName = profile.full_name || profile.name || account.name || '';

  return {
    id: account.$id,
    email: account.email,
    name: fullName || account.name,
    full_name: fullName || account.name,
    role: profile.role || 'team',
    agencyId,
    clientId,
    status: profile.status || 'active',
    data: {
      agencyId,
      clientId,
      role: profile.role || 'team',
    },
    prefs: account.prefs || {},
  };
}

async function getProfile(userId) {
  try {
    const tables = getTablesDB();
    return await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: 'profiles',
      rowId: userId,
    });
  } catch {
    return null;
  }
}

export const authAdapter = {
  async me() {
    const account = getAccount();
    const user = await account.get();
    const profile = await getProfile(user.$id);
    return mapUser(user, profile || {});
  },

  async login(credentials) {
    if (!credentials?.email || !credentials?.password) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    const account = getAccount();
    try {
      await account.deleteSession({ sessionId: 'current' });
    } catch {
      // no existing session
    }
    await account.createEmailPasswordSession({
      email: credentials.email,
      password: credentials.password,
    });
    return this.me();
  },

  async logout() {
    const account = getAccount();
    try {
      await account.deleteSession({ sessionId: 'current' });
    } catch {
      // already logged out
    }
  },

  async create(userData = {}) {
    const account = getAccount();
    const tables = getTablesDB();
    const teams = getTeams();
    const userId = userData.id || ID.unique();
    const name = userData.name || userData.full_name || userData.email;
    const password = userData.password;

    if (password) {
      await account.create({
        userId,
        email: userData.email,
        password,
        name,
      });
    }

    if (userData.agencyId) {
      try {
        await teams.createMembership({
          teamId: userData.agencyId,
          roles: [userData.role || 'team'],
          userId,
          url: typeof window !== 'undefined'
            ? `${window.location.origin}/invite-accept`
            : undefined,
        });
      } catch (error) {
        console.warn('[Appwrite] Não foi possível adicionar usuário ao time:', error.message);
      }
    }

    const profile = await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: 'profiles',
      rowId: userId,
      data: {
        agencyId: userData.agencyId || '',
        role: userData.role || 'team',
        clientId: userData.clientId || '',
        name,
        email: userData.email || '',
        full_name: name,
        status: userData.status || 'active',
        payload: JSON.stringify({
          isTemporaryPassword: userData.isTemporaryPassword || false,
          createdBy: userData.createdBy || null,
        }),
      },
      permissions: [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        ...(userData.agencyId ? [
          Permission.read(Role.team(userData.agencyId)),
          Permission.update(Role.team(userData.agencyId)),
        ] : []),
      ],
    });

    return {
      id: profile.$id,
      ...userData,
      name,
      full_name: name,
    };
  },

  async update(id, data = {}) {
    return this.updateMyUserData(data, id);
  },

  async updateMyUserData(data = {}, userId) {
    const account = getAccount();
    const tables = getTablesDB();
    const current = await account.get();
    const id = userId || current.$id;
    const existing = await getProfile(id);
    const next = {
      agencyId: data.agencyId ?? existing?.agencyId ?? '',
      role: data.role ?? existing?.role ?? 'team',
      clientId: data.clientId ?? existing?.clientId ?? '',
      name: data.name || data.full_name || existing?.name || current.name,
      email: data.email || existing?.email || current.email,
      full_name: data.full_name || data.name || existing?.full_name || current.name,
      status: data.status ?? existing?.status ?? 'active',
    };

    let extra = {};
    if (existing?.payload) {
      try { extra = JSON.parse(existing.payload); } catch { extra = {}; }
    }
    const reserved = new Set(['agencyId', 'role', 'clientId', 'name', 'email', 'full_name', 'status', 'id']);
    for (const [key, value] of Object.entries(data)) {
      if (!reserved.has(key)) extra[key] = value;
    }
    next.payload = JSON.stringify(extra);

    const updated = await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: 'profiles',
      rowId: id,
      data: next,
    });

    if (data.name || data.full_name) {
      try {
        await account.updateName({ name: next.name });
      } catch {
        // ignore name update failures
      }
    }

    return mapUser(current, updated);
  },

  async filter(filters = {}, order, limit) {
    const profiles = createEntityAdapter('profiles');
    return profiles.filter(filters, order, limit);
  },
};

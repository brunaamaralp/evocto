/**
 * POST /api/team-members?route=create-with-password | update-credentials
 * Cria/atualiza usuário Auth + membership + profile.
 * Auth: Bearer JWT Appwrite; só owner/admin.
 */
import { Users, Teams, ID, Permission, Role, Query } from 'node-appwrite';
import {
  getAdminClient,
  getAdminTables,
  requireAgencyStaff,
} from './materialAppwrite.js';

// role=client NÃO usa esta API (portal via criação de cliente + API admin).
const VALID_ROLES = new Set(['admin', 'team']);
const VALID_ROUTES = new Set(['create-with-password', 'update-credentials']);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateSharePassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = chars.length; i < length; i += 1) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function parseBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body || {};
}

function loginUrlFromEnv() {
  const base = String(process.env.APP_PUBLIC_URL || process.env.VITE_APP_PUBLIC_URL || '')
    .replace(/\/+$/, '');
  return base ? `${base}/login` : '/login';
}

async function requireOwnerOrAdmin(req, res) {
  const auth = await requireAgencyStaff(req, res);
  if (!auth) return null;
  if (!['owner', 'admin'].includes(String(auth.role || '').toLowerCase())) {
    res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'Apenas administradores podem gerenciar membros.',
    });
    return null;
  }
  return auth;
}

async function ensureEmailVerified(users, userId) {
  try {
    await users.updateEmailVerification({ userId, emailVerification: true });
  } catch (err) {
    console.warn('[team-members] updateEmailVerification:', err?.message || err);
  }
}

function profilePermissions(userId, agencyId) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.read(Role.team(agencyId)),
    Permission.update(Role.team(agencyId)),
    Permission.delete(Role.team(agencyId)),
  ];
}

async function handleCreateWithPassword(req, res, auth) {
  const body = parseBody(req);
  const email = normalizeEmail(body.email);
  const role = String(body.role || 'team').trim().toLowerCase();
  const displayName = String(body.name || '').trim() || email.split('@')[0];
  const password = String(body.password || '').trim() || generateSharePassword();

  if (!email || !isValidEmail(email)) {
    res.status(400).json({ success: false, error: 'invalid_email', message: 'E-mail inválido' });
    return;
  }
  if (!VALID_ROLES.has(role)) {
    res.status(400).json({ success: false, error: 'invalid_role', message: 'Função inválida' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({
      success: false,
      error: 'weak_password',
      message: 'A senha deve ter pelo menos 8 caracteres',
    });
    return;
  }

  const { tables, databaseId } = getAdminTables();
  const client = getAdminClient();
  const users = new Users(client);
  const teams = new Teams(client);

  try {
    const existing = await tables.listRows({
      databaseId,
      tableId: 'profiles',
      queries: [
        Query.equal('agencyId', auth.agencyId),
        Query.equal('email', email),
        Query.limit(1),
      ],
    });
    const rows = existing.rows || existing.documents || [];
    if (rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'already_member',
        message: 'Este e-mail já é membro da equipe',
      });
      return;
    }
  } catch (err) {
    console.warn('[team-members] profile lookup:', err?.message || err);
  }

  let userId = ID.unique();
  let reusedExistingAuthUser = false;

  try {
    await users.create({
      userId,
      email,
      password,
      name: displayName,
    });
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    const code = err?.code || err?.type;
    if (code === 409 || msg.includes('already') || msg.includes('exists')) {
      try {
        const listed = await users.list({
          queries: [Query.equal('email', email), Query.limit(1)],
        });
        const existingUser = listed?.users?.[0];
        if (!existingUser?.$id) {
          res.status(409).json({
            success: false,
            error: 'email_in_use',
            message:
              'Já existe uma conta Auth com este e-mail. Use outro e-mail ou remova o usuário no Appwrite Console.',
          });
          return;
        }
        userId = existingUser.$id;
        reusedExistingAuthUser = true;
        try {
          await users.updatePassword({ userId, password });
        } catch (pwdErr) {
          console.error('[team-members] updatePassword:', pwdErr);
          res.status(500).json({
            success: false,
            error: 'password_update_failed',
            message:
              pwdErr?.message
              || 'Não foi possível definir a senha desta conta. Tente de novo ou use outro e-mail.',
          });
          return;
        }
        try {
          await users.updateName({ userId, name: displayName });
        } catch {
          // optional
        }
      } catch (listErr) {
        console.error('[team-members] users.list:', listErr);
        res.status(409).json({
          success: false,
          error: 'email_in_use',
          message:
            'Já existe uma conta Auth com este e-mail. Use outro e-mail ou remova o usuário no Appwrite Console.',
        });
        return;
      }
    } else {
      console.error('[team-members] users.create:', err);
      res.status(500).json({
        success: false,
        error: 'user_create_failed',
        message: err?.message || 'Falha ao criar usuário',
      });
      return;
    }
  }

  await ensureEmailVerified(users, userId);

  try {
    // Server SDK: membership confirmado imediatamente (sem e-mail)
    await teams.createMembership({
      teamId: auth.agencyId,
      roles: [role],
      userId,
    });
  } catch (err) {
    console.warn('[team-members] createMembership:', err?.message || err);
  }

  try {
    const existingProfile = await tables.getRow({
      databaseId,
      tableId: 'profiles',
      rowId: userId,
    }).catch(() => null);

    const profileData = {
      agencyId: auth.agencyId,
      role,
      clientId: '',
      name: displayName,
      email,
      full_name: displayName,
      status: 'active',
      payload: JSON.stringify({
        isTemporaryPassword: true,
        createdBy: auth.user.$id,
        createdVia: 'password_share',
        reusedExistingAuthUser,
      }),
    };
    const profilePerms = profilePermissions(userId, auth.agencyId);

    if (existingProfile?.$id) {
      await tables.updateRow({
        databaseId,
        tableId: 'profiles',
        rowId: userId,
        data: profileData,
        permissions: profilePerms,
      });
    } else {
      await tables.createRow({
        databaseId,
        tableId: 'profiles',
        rowId: userId,
        data: profileData,
        permissions: profilePerms,
      });
    }
  } catch (err) {
    console.error('[team-members] profile create:', err);
    res.status(500).json({
      success: false,
      error: 'profile_create_failed',
      message: err?.message || 'Usuário criado no Auth, mas o perfil falhou. Contate o suporte.',
      userId,
    });
    return;
  }

  const loginUrl = loginUrlFromEnv();
  const message = reusedExistingAuthUser
    ? 'Conta existente vinculada à agência. Compartilhe e-mail e a nova senha.'
    : 'Membro criado. Compartilhe e-mail e senha com a pessoa.';

  res.status(200).json({
    success: true,
    method: 'password',
    message,
    temporaryPassword: password,
    email,
    name: displayName,
    userId,
    loginUrl,
    data: {
      success: true,
      method: 'password',
      message,
      temporaryPassword: password,
      email,
      name: displayName,
      userId,
      loginUrl,
    },
  });
}

async function handleUpdateCredentials(req, res, auth) {
  const body = parseBody(req);
  const userId = String(body.userId || body.id || '').trim();
  if (!userId) {
    res.status(400).json({
      success: false,
      error: 'missing_user_id',
      message: 'Informe o membro a atualizar.',
    });
    return;
  }

  if (userId === auth.user.$id) {
    res.status(400).json({
      success: false,
      error: 'cannot_edit_self',
      message: 'Para alterar sua própria senha, use Minha conta.',
    });
    return;
  }

  const emailProvided = body.email !== undefined && body.email !== null && String(body.email).trim() !== '';
  const passwordProvided = body.password !== undefined && body.password !== null && String(body.password).trim() !== '';
  const nameProvided = body.name !== undefined && body.name !== null && String(body.name).trim() !== '';

  if (!emailProvided && !passwordProvided && !nameProvided) {
    res.status(400).json({
      success: false,
      error: 'nothing_to_update',
      message: 'Informe e-mail, senha ou nome para atualizar.',
    });
    return;
  }

  const nextEmail = emailProvided ? normalizeEmail(body.email) : null;
  const nextPassword = passwordProvided ? String(body.password).trim() : null;
  const nextName = nameProvided ? String(body.name).trim() : null;

  if (emailProvided && (!nextEmail || !isValidEmail(nextEmail))) {
    res.status(400).json({ success: false, error: 'invalid_email', message: 'E-mail inválido' });
    return;
  }
  if (passwordProvided && nextPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: 'weak_password',
      message: 'A senha deve ter pelo menos 8 caracteres',
    });
    return;
  }

  const { tables, databaseId } = getAdminTables();
  const client = getAdminClient();
  const users = new Users(client);

  let profile;
  try {
    profile = await tables.getRow({
      databaseId,
      tableId: 'profiles',
      rowId: userId,
    });
  } catch {
    res.status(404).json({
      success: false,
      error: 'not_found',
      message: 'Membro não encontrado.',
    });
    return;
  }

  if (String(profile.agencyId || '') !== String(auth.agencyId || '')) {
    res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'Este membro não pertence à sua agência.',
    });
    return;
  }

  const role = String(profile.role || '').toLowerCase();
  if (role === 'owner') {
    res.status(403).json({
      success: false,
      error: 'cannot_edit_owner',
      message: 'Não é possível editar as credenciais do proprietário por aqui.',
    });
    return;
  }
  if (role === 'client') {
    res.status(400).json({
      success: false,
      error: 'not_team_member',
      message: 'Use o fluxo de cliente para contas de portal.',
    });
    return;
  }

  if (nextEmail && nextEmail !== normalizeEmail(profile.email)) {
    try {
      const clash = await tables.listRows({
        databaseId,
        tableId: 'profiles',
        queries: [
          Query.equal('agencyId', auth.agencyId),
          Query.equal('email', nextEmail),
          Query.limit(5),
        ],
      });
      const conflict = (clash.rows || clash.documents || []).find((row) => row.$id !== userId);
      if (conflict) {
        res.status(409).json({
          success: false,
          error: 'already_member',
          message: 'Este e-mail já é usado por outro membro da equipe',
        });
        return;
      }
    } catch (err) {
      console.warn('[team-members] email clash lookup:', err?.message || err);
    }

    try {
      await users.updateEmail({ userId, email: nextEmail });
    } catch (err) {
      console.error('[team-members] updateEmail:', err);
      res.status(500).json({
        success: false,
        error: 'email_update_failed',
        message: err?.message || 'Não foi possível atualizar o e-mail no Auth.',
      });
      return;
    }
  }

  if (nextPassword) {
    try {
      await users.updatePassword({ userId, password: nextPassword });
    } catch (err) {
      console.error('[team-members] updatePassword:', err);
      res.status(500).json({
        success: false,
        error: 'password_update_failed',
        message: err?.message || 'Não foi possível atualizar a senha.',
      });
      return;
    }
  }

  if (nextName) {
    try {
      await users.updateName({ userId, name: nextName });
    } catch (err) {
      console.warn('[team-members] updateName:', err?.message || err);
    }
  }

  await ensureEmailVerified(users, userId);

  const displayName = nextName || profile.full_name || profile.name || nextEmail || profile.email;
  const email = nextEmail || normalizeEmail(profile.email);

  let extra = {};
  if (profile.payload) {
    try {
      extra = JSON.parse(profile.payload);
    } catch {
      extra = {};
    }
  }
  if (nextPassword) {
    extra.isTemporaryPassword = true;
    extra.passwordResetBy = auth.user.$id;
    extra.passwordResetAt = new Date().toISOString();
  }
  extra.credentialsUpdatedBy = auth.user.$id;
  extra.credentialsUpdatedAt = new Date().toISOString();

  try {
    await tables.updateRow({
      databaseId,
      tableId: 'profiles',
      rowId: userId,
      data: {
        name: displayName,
        full_name: displayName,
        email,
        payload: JSON.stringify(extra),
      },
      permissions: profilePermissions(userId, auth.agencyId),
    });
  } catch (err) {
    console.error('[team-members] profile update:', err);
    res.status(500).json({
      success: false,
      error: 'profile_update_failed',
      message: err?.message || 'Auth atualizado, mas o perfil falhou.',
      userId,
    });
    return;
  }

  const loginUrl = loginUrlFromEnv();
  const message = nextPassword
    ? 'Credenciais atualizadas. Compartilhe o novo acesso com a pessoa.'
    : 'Dados do membro atualizados.';

  res.status(200).json({
    success: true,
    method: 'update',
    message,
    temporaryPassword: nextPassword || undefined,
    email,
    name: displayName,
    userId,
    loginUrl,
    data: {
      success: true,
      method: 'update',
      message,
      temporaryPassword: nextPassword || undefined,
      email,
      name: displayName,
      userId,
      loginUrl,
    },
  });
}

export default async function teamMembersHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'method_not_allowed' });
    return;
  }

  const route = String(req.query?.route || req.query?.action || 'create-with-password').trim();
  if (!VALID_ROUTES.has(route)) {
    res.status(404).json({ success: false, error: 'route_not_found' });
    return;
  }

  const auth = await requireOwnerOrAdmin(req, res);
  if (!auth) return;

  if (route === 'update-credentials') {
    await handleUpdateCredentials(req, res, auth);
    return;
  }

  await handleCreateWithPassword(req, res, auth);
}

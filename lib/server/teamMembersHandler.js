/**
 * POST /api/team-members?route=create-with-password
 * Cria usuário Auth + membership confirmado (API key) + profile.
 * Auth: Bearer JWT Appwrite; só owner/admin.
 */
import { Users, Teams, ID, Permission, Role, Query } from 'node-appwrite';
import {
  getAdminClient,
  getAdminTables,
  requireAgencyStaff,
} from './materialAppwrite.js';

const VALID_ROLES = new Set(['admin', 'team', 'client']);

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

async function requireOwnerOrAdmin(req, res) {
  const auth = await requireAgencyStaff(req, res);
  if (!auth) return null;
  if (!['owner', 'admin'].includes(String(auth.role || '').toLowerCase())) {
    res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'Apenas administradores podem adicionar membros.',
    });
    return null;
  }
  return auth;
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
  if (route !== 'create-with-password') {
    res.status(404).json({ success: false, error: 'route_not_found' });
    return;
  }

  const auth = await requireOwnerOrAdmin(req, res);
  if (!auth) return;

  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
    : (req.body || {});

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

  // Já é membro desta agência?
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
      // Recupera usuário Auth órfão (criado em tentativa anterior sem profile)
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
          console.warn('[team-members] updatePassword:', pwdErr?.message || pwdErr);
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

  try {
    // Server SDK: membership confirmado imediatamente (sem e-mail)
    await teams.createMembership({
      teamId: auth.agencyId,
      roles: [role],
      userId,
    });
  } catch (err) {
    console.warn('[team-members] createMembership:', err?.message || err);
    // Pode já ser membro do time — seguimos para o profile
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
    const profilePerms = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.read(Role.team(auth.agencyId)),
      Permission.update(Role.team(auth.agencyId)),
      Permission.delete(Role.team(auth.agencyId)),
    ];

    if (existingProfile?.$id) {
      await tables.updateRow({
        databaseId,
        tableId: 'profiles',
        rowId: userId,
        data: profileData,
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

  const loginUrl = String(process.env.APP_PUBLIC_URL || process.env.VITE_APP_PUBLIC_URL || '')
    .replace(/\/+$/, '');

  res.status(200).json({
    success: true,
    method: 'password',
    message: reusedExistingAuthUser
      ? 'Conta existente vinculada à agência. Compartilhe e-mail e a nova senha.'
      : 'Membro criado. Compartilhe e-mail e senha com a pessoa.',
    temporaryPassword: password,
    email,
    name: displayName,
    userId,
    loginUrl: loginUrl ? `${loginUrl}/login` : '/login',
    data: {
      success: true,
      method: 'password',
      message: reusedExistingAuthUser
        ? 'Conta existente vinculada à agência. Compartilhe e-mail e a nova senha.'
        : 'Membro criado. Compartilhe e-mail e senha com a pessoa.',
      temporaryPassword: password,
      email,
      name: displayName,
      userId,
      loginUrl: loginUrl ? `${loginUrl}/login` : '/login',
    },
  });
}

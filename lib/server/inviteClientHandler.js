/**
 * POST /api/invite-client
 * Cria usuário Auth + profile role=client vinculado a um clientId.
 * Clientes NÃO entram no Team da agência (portal via requireClient).
 * Auth: Bearer JWT Appwrite; equipe da agência.
 */
import { Users, ID, Permission, Role, Query } from 'node-appwrite';
import {
  getAdminClient,
  getAdminTables,
  requireAgencyStaff,
  parsePayload,
  splitTyped,
  getEnvConfig,
} from './materialAppwrite.js';

const CLIENT_COLUMNS = ['agencyId', 'name', 'status', 'email', 'phone'];

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

function loginUrl() {
  const { publicAppUrl } = getEnvConfig();
  return publicAppUrl ? `${publicAppUrl}/client-login` : '/client-login';
}

async function markClientPortalAccess(tables, databaseId, clientId, agencyId) {
  try {
    const row = await tables.getRow({
      databaseId,
      tableId: 'clients',
      rowId: clientId,
    });
    const merged = parsePayload(row);
    if (merged.agencyId && merged.agencyId !== agencyId) return;

    const data = splitTyped(CLIENT_COLUMNS, {
      ...merged,
      portal_enabled: true,
      has_portal_access: true,
    });
    await tables.updateRow({
      databaseId,
      tableId: 'clients',
      rowId: clientId,
      data,
    });
  } catch (err) {
    console.warn('[invite-client] mark portal flags:', err?.message || err);
  }
}

export default async function inviteClientHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'method_not_allowed' });
    return;
  }

  const auth = await requireAgencyStaff(req, res);
  if (!auth) return;

  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
    : (req.body || {});

  const clientId = String(body.clientId || '').trim();
  const email = normalizeEmail(body.email);
  const displayName = String(body.fullName || body.name || '').trim() || email.split('@')[0];
  const password = String(body.password || '').trim() || generateSharePassword();
  const sendEmail = body.sendEmail !== false;

  if (!clientId) {
    res.status(400).json({ success: false, error: 'invalid_client', message: 'clientId é obrigatório' });
    return;
  }
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ success: false, error: 'invalid_email', message: 'E-mail inválido' });
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

  // Cliente existe e pertence à agência?
  let clientRow;
  try {
    clientRow = await tables.getRow({
      databaseId,
      tableId: 'clients',
      rowId: clientId,
    });
  } catch {
    res.status(404).json({
      success: false,
      error: 'client_not_found',
      message: 'Cliente não encontrado',
    });
    return;
  }

  const clientData = parsePayload(clientRow);
  if (clientData.agencyId && clientData.agencyId !== auth.agencyId) {
    res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'Cliente não pertence à sua agência',
    });
    return;
  }

  // Já tem profile com este e-mail nesta agência?
  try {
    const existing = await tables.listRows({
      databaseId,
      tableId: 'profiles',
      queries: [
        Query.equal('agencyId', auth.agencyId),
        Query.equal('email', email),
        Query.limit(5),
      ],
    });
    const rows = (existing.rows || existing.documents || []).map(parsePayload);
    const sameClient = rows.find(
      (p) => String(p.role || '').toLowerCase() === 'client' && String(p.clientId || '') === clientId
    );
    if (sameClient) {
      await markClientPortalAccess(tables, databaseId, clientId, auth.agencyId);
      res.status(200).json({
        success: true,
        alreadyExists: true,
        emailSent: false,
        message: 'Cliente já tem acesso ao portal',
        userId: sameClient.id,
        email,
        loginUrl: loginUrl(),
        data: {
          success: true,
          alreadyExists: true,
          emailSent: false,
          userId: sameClient.id,
          email,
          loginUrl: loginUrl(),
        },
      });
      return;
    }

    const otherProfile = rows.find((p) => p.id);
    if (otherProfile) {
      const role = String(otherProfile.role || '').toLowerCase();
      if (role === 'client' && otherProfile.clientId && otherProfile.clientId !== clientId) {
        res.status(409).json({
          success: false,
          error: 'email_other_client',
          message: 'Este e-mail já está vinculado a outro cliente nesta agência',
        });
        return;
      }
      if (['owner', 'admin', 'team'].includes(role)) {
        res.status(409).json({
          success: false,
          error: 'email_staff',
          message: 'Este e-mail já é usado por um membro da equipe',
        });
        return;
      }
      res.status(409).json({
        success: false,
        error: 'already_member',
        message: 'Este e-mail já está em uso nesta agência',
      });
      return;
    }
  } catch (err) {
    console.warn('[invite-client] profile lookup:', err?.message || err);
  }

  // E-mail em outra agência?
  try {
    const byEmail = await tables.listRows({
      databaseId,
      tableId: 'profiles',
      queries: [Query.equal('email', email), Query.limit(10)],
    });
    const otherAgency = (byEmail.rows || byEmail.documents || [])
      .map(parsePayload)
      .find((p) => p.agencyId && p.agencyId !== auth.agencyId);
    if (otherAgency) {
      res.status(409).json({
        success: false,
        error: 'email_in_other_agency',
        message: 'Este e-mail já está em uso em outra agência',
      });
      return;
    }
  } catch (err) {
    console.warn('[invite-client] cross-agency lookup:', err?.message || err);
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
              'Já existe uma conta Auth com este e-mail, mas não foi possível recuperá-la automaticamente. Tente outro e-mail.',
          });
          return;
        }
        userId = existingUser.$id;
        reusedExistingAuthUser = true;
        try {
          await users.updatePassword({ userId, password });
        } catch (pwdErr) {
          console.warn('[invite-client] updatePassword:', pwdErr?.message || pwdErr);
        }
        try {
          await users.updateName({ userId, name: displayName });
        } catch {
          // optional
        }
      } catch (listErr) {
        console.error('[invite-client] users.list:', listErr);
        res.status(409).json({
          success: false,
          error: 'email_in_use',
          message:
            'Já existe uma conta Auth com este e-mail, mas não foi possível recuperá-la automaticamente. Tente outro e-mail.',
        });
        return;
      }
    } else {
      console.error('[invite-client] users.create:', err);
      res.status(500).json({
        success: false,
        error: 'user_create_failed',
        message: err?.message || 'Falha ao criar usuário',
      });
      return;
    }
  }

  // Profile role=client — sem membership no Team
  try {
    const existingProfile = await tables.getRow({
      databaseId,
      tableId: 'profiles',
      rowId: userId,
    }).catch(() => null);

    const profileData = {
      agencyId: auth.agencyId,
      role: 'client',
      clientId,
      name: displayName,
      email,
      full_name: displayName,
      status: 'active',
      payload: JSON.stringify({
        isTemporaryPassword: true,
        createdBy: auth.user.$id,
        createdVia: 'invite_client',
        reusedExistingAuthUser,
        sendEmailRequested: sendEmail,
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
      // Reaproveita órfãos / tentativas anteriores e corrige ACL (Role.user do cliente).
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
    console.error('[invite-client] profile create:', err);
    res.status(500).json({
      success: false,
      error: 'profile_create_failed',
      message: err?.message || 'Usuário criado no Auth, mas o perfil falhou. Contate o suporte.',
      userId,
    });
    return;
  }

  await markClientPortalAccess(tables, databaseId, clientId, auth.agencyId);

  // E-mail transacional ainda não migrado — senha para compartilhar manualmente.
  const emailSent = false;
  const portalLogin = loginUrl();

  res.status(200).json({
    success: true,
    alreadyExists: false,
    emailSent,
    message: emailSent
      ? `Convite enviado para ${email}`
      : reusedExistingAuthUser
        ? 'Conta anterior reaproveitada. Compartilhe e-mail e a nova senha com o contato.'
        : 'Usuário criado. Compartilhe e-mail e senha com o contato.',
    temporaryPassword: password,
    email,
    name: displayName,
    userId,
    clientId,
    loginUrl: portalLogin,
    data: {
      success: true,
      alreadyExists: false,
      emailSent,
      temporaryPassword: password,
      email,
      name: displayName,
      userId,
      clientId,
      loginUrl: portalLogin,
    },
  });
}

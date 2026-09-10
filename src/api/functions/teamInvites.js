import { getAccount, getTeams, ID } from '@/api/appwriteClient';
import { createEntityAdapter } from '../appwrite/entityAdapter';
import { createSessionJwt } from '@/lib/appwrite';

const Invite = createEntityAdapter('invites');
const Profile = createEntityAdapter('profiles');
const Agency = createEntityAdapter('agencies');

const VALID_ROLES = new Set(['admin', 'team', 'client']);
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function ok(payload = {}) {
  return {
    success: true,
    ...payload,
    data: { success: true, ...payload },
  };
}

function fail(error, message, extra = {}) {
  return {
    success: false,
    error,
    message,
    ...extra,
    data: { success: false, error, message, ...extra },
  };
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
  if (typeof window === 'undefined') return '/login';
  return `${window.location.origin}/login`;
}

function daysSince(dateValue) {
  const ts = dateValue ? new Date(dateValue).getTime() : NaN;
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000)));
}

function isExpiredInvite(invite) {
  if (invite?.status === 'expired') return true;
  const expiresAt = invite?.expiresAt;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function inviteRedirectUrl(token) {
  if (typeof window === 'undefined') return undefined;
  const url = new URL('/invite-accept', window.location.origin);
  if (token) url.searchParams.set('token', token);
  return url.toString();
}

async function getActor() {
  const account = getAccount();
  const user = await account.get();
  const profile = await Profile.get(user.$id).catch(() => null);
  return {
    userId: user.$id,
    email: normalizeEmail(user.email),
    name: user.name || profile?.full_name || profile?.name || '',
    agencyId: profile?.agencyId || null,
    role: profile?.role || 'team',
  };
}

function assertCanManageInvites(actor) {
  if (!actor?.agencyId) {
    throw new Error('Agência não encontrada para o usuário atual.');
  }
  if (!['owner', 'admin'].includes(actor.role)) {
    throw new Error('Apenas administradores podem gerenciar convites.');
  }
}

async function listAgencyInvites(agencyId) {
  const invites = await Invite.filter({ agencyId }, '-created_date', 200);
  return Array.isArray(invites) ? invites : [];
}

async function assertEmailAvailable(actor, normalizedEmail) {
  const agencyProfiles = await Profile.filter({ agencyId: actor.agencyId }, undefined, 200).catch(() => []);
  const sameAgency = (agencyProfiles || []).find((p) => normalizeEmail(p.email) === normalizedEmail);
  if (sameAgency) {
    return fail('already_member', 'Este e-mail já é membro da equipe');
  }

  const profilesByEmail = await Profile.filter({ email: normalizedEmail }, undefined, 20).catch(() => []);
  const otherAgency = (profilesByEmail || []).find((p) => p.agencyId && p.agencyId !== actor.agencyId);
  if (otherAgency) {
    return fail(
      'email_in_other_agency',
      'Este e-mail já está em uso em outra agência',
      { suggestion: 'Peça para a pessoa usar outro e-mail ou sair da outra agência.' }
    );
  }
  return null;
}

function enrichInvite(invite) {
  const expired = isExpiredInvite(invite);
  const status = expired && invite.status === 'sent' ? 'expired' : invite.status;
  const canAct = status === 'sent';
  return {
    ...invite,
    status,
    created_at: invite.created_date || invite.created_at || null,
    daysSinceSent: daysSince(invite.created_date || invite.created_at),
    canResend: canAct,
    canRevoke: canAct,
  };
}

function buildStats(invites) {
  const stats = { total: invites.length, sent: 0, accepted: 0, expired: 0, revoked: 0 };
  for (const invite of invites) {
    if (invite.status === 'sent') stats.sent += 1;
    else if (invite.status === 'accepted') stats.accepted += 1;
    else if (invite.status === 'expired') stats.expired += 1;
    else if (invite.status === 'revoked') stats.revoked += 1;
  }
  return stats;
}

async function createTeamMembership({ agencyId, email, role, token, userId }) {
  const teams = getTeams();
  // Client SDK exige `url` mesmo com userId.
  const url = inviteRedirectUrl(token) || loginUrl().replace(/\/login$/, '/invite-accept');
  return teams.createMembership({
    teamId: agencyId,
    roles: [role],
    url,
    ...(userId ? { userId } : { email }),
  });
}

async function createMemberWithPasswordViaApi({ email, role, name, password }) {
  const jwt = await createSessionJwt();
  if (!jwt) return null;

  let res;
  try {
    res = await fetch('/api/team-members?route=create-with-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ email, role, name, password }),
    });
  } catch (err) {
    console.warn('[teamInvites] API team-members indisponível:', err?.message || err);
    return null;
  }

  const contentType = String(res.headers.get('content-type') || '');
  // SPA fallback / function ausente → HTML ou 404
  if (res.status === 404 || contentType.includes('text/html')) {
    return null;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    return fail(
      json.error || 'api_error',
      json.message || 'Não foi possível criar o membro.',
      json.suggestion ? { suggestion: json.suggestion } : {}
    );
  }

  const payload = json.data || json;
  return ok({
    method: 'password',
    message: payload.message || 'Membro criado. Compartilhe e-mail e senha com a pessoa.',
    temporaryPassword: payload.temporaryPassword || password,
    email: payload.email || email,
    name: payload.name || name,
    userId: payload.userId,
    loginUrl: payload.loginUrl || loginUrl(),
  });
}

async function deleteTeamMembership(agencyId, membershipId) {
  if (!agencyId || !membershipId) return;
  try {
    const teams = getTeams();
    await teams.deleteMembership({ teamId: agencyId, membershipId });
  } catch (error) {
    console.warn('[teamInvites] Falha ao remover membership:', error?.message || error);
  }
}

async function createMemberWithPassword({ email, role, name, password } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role || '').trim().toLowerCase();
  const displayName = String(name || '').trim() || normalizedEmail.split('@')[0];
  const sharePassword = String(password || '').trim() || generateSharePassword();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return fail('invalid_email', 'Formato de e-mail inválido');
  }
  if (!VALID_ROLES.has(normalizedRole)) {
    return fail('invalid_role', 'Função selecionada é inválida');
  }
  if (sharePassword.length < 8) {
    return fail('weak_password', 'A senha deve ter pelo menos 8 caracteres');
  }

  const actor = await getActor();
  assertCanManageInvites(actor);

  const availability = await assertEmailAvailable(actor, normalizedEmail);
  if (availability) return availability;

  // Preferir API server (Users + membership confirmado + recuperação de órfãos).
  const viaApi = await createMemberWithPasswordViaApi({
    email: normalizedEmail,
    role: normalizedRole,
    name: displayName,
    password: sharePassword,
  });
  if (viaApi) return viaApi;

  // Fallback client: mesmo padrão usado para criar usuários de cliente (authAdapter).
  const { authAdapter } = await import('../appwrite/authAdapter.js');
  try {
    const created = await authAdapter.create({
      email: normalizedEmail,
      password: sharePassword,
      name: displayName,
      full_name: displayName,
      role: normalizedRole,
      agencyId: actor.agencyId,
      isTemporaryPassword: true,
      createdBy: actor.userId,
    });

    return ok({
      method: 'password',
      message: 'Membro criado. Compartilhe e-mail e senha com a pessoa.',
      temporaryPassword: sharePassword,
      email: normalizedEmail,
      name: displayName,
      userId: created?.id,
      loginUrl: loginUrl(),
    });
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    const code = error?.code;
    if (code === 409 || msg.includes('already') || msg.includes('exists')) {
      return fail(
        'email_in_use',
        'Já existe uma conta Auth com este e-mail (provavelmente de uma tentativa anterior que falhou). Use outro e-mail, ou no Appwrite Console → Auth apague esse usuário e tente de novo.',
        {
          suggestion: 'E-mails que falharam antes ficam “órfãos” no Auth. Apague-os no Console ou escolha um e-mail diferente.',
        }
      );
    }
    console.error('[teamInvites] fallback User.create:', error);
    return fail('create_failed', error?.message || 'Não foi possível criar o membro.');
  }
}

async function createMemberInviteEmail({ email, role } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return fail('invalid_email', 'Formato de e-mail inválido');
  }
  if (!VALID_ROLES.has(normalizedRole)) {
    return fail('invalid_role', 'Função selecionada é inválida');
  }

  const actor = await getActor();
  assertCanManageInvites(actor);

  const availability = await assertEmailAvailable(actor, normalizedEmail);
  if (availability) return availability;

  const existingInvites = await listAgencyInvites(actor.agencyId);
  const pending = existingInvites.find(
    (inv) => normalizeEmail(inv.email) === normalizedEmail && inv.status === 'sent' && !isExpiredInvite(inv)
  );
  if (pending) {
    return fail('invite_already_sent', 'Já existe um convite pendente para este e-mail');
  }

  const token = ID.unique();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  let membershipId = null;
  let membershipWarning = null;
  try {
    const membership = await createTeamMembership({
      agencyId: actor.agencyId,
      email: normalizedEmail,
      role: normalizedRole,
      token,
    });
    membershipId = membership?.$id || null;
  } catch (error) {
    membershipWarning = error?.message || 'Não foi possível enviar o e-mail do Appwrite Teams.';
    console.warn('[teamInvites] createMembership falhou:', membershipWarning);
  }

  const invite = await Invite.create({
    agencyId: actor.agencyId,
    email: normalizedEmail,
    role: normalizedRole,
    status: 'sent',
    token,
    expiresAt,
    invitedBy: actor.userId,
    invitedByEmail: actor.email,
    membershipId,
    method: 'email',
  });

  return ok({
    method: 'email',
    message: membershipId
      ? `Convite enviado para ${normalizedEmail}`
      : `Convite criado para ${normalizedEmail}. O e-mail automático falhou — compartilhe o link de aceite.`,
    invite,
    inviteUrl: inviteRedirectUrl(token),
    warning: membershipWarning || undefined,
  });
}

/**
 * Convida membro por e-mail ou cria conta com senha para compartilhar.
 * @param {{ email: string, role: string, method?: 'email'|'password', name?: string, password?: string }}
 */
export async function sendInvite(params = {}) {
  const method = String(params.method || 'email').trim().toLowerCase();
  if (method === 'password') {
    return createMemberWithPassword(params);
  }
  return createMemberInviteEmail(params);
}

async function listInvites() {
  const actor = await getActor();
  assertCanManageInvites(actor);

  const raw = await listAgencyInvites(actor.agencyId);
  const invites = [];

  for (const invite of raw) {
    const enriched = enrichInvite(invite);
    if (invite.status === 'sent' && enriched.status === 'expired') {
      try {
        await Invite.update(invite.id, { status: 'expired' });
      } catch {
        // best-effort
      }
    }
    invites.push(enriched);
  }

  return ok({
    invites,
    stats: buildStats(invites),
  });
}

async function resendInvite(inviteId) {
  const actor = await getActor();
  assertCanManageInvites(actor);

  const invite = await Invite.get(inviteId);
  if (!invite?.id || invite.agencyId !== actor.agencyId) {
    return fail('not_found', 'Convite não encontrado');
  }
  if (invite.status === 'accepted') {
    return fail('already_accepted', 'Este convite já foi aceito');
  }
  if (invite.status === 'revoked') {
    return fail('revoked', 'Este convite foi revogado');
  }

  const token = invite.token || ID.unique();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  if (invite.membershipId) {
    await deleteTeamMembership(actor.agencyId, invite.membershipId);
  }

  let membershipId = null;
  try {
    const membership = await createTeamMembership({
      agencyId: actor.agencyId,
      email: normalizeEmail(invite.email),
      role: invite.role || 'team',
      token,
    });
    membershipId = membership?.$id || null;
  } catch (error) {
    console.warn('[teamInvites] resend createMembership falhou:', error?.message || error);
  }

  await Invite.update(invite.id, {
    status: 'sent',
    token,
    expiresAt,
    membershipId,
    resentAt: new Date().toISOString(),
    resentBy: actor.userId,
  });

  return ok({
    message: membershipId
      ? 'Convite reenviado com sucesso!'
      : 'Convite atualizado. O e-mail automático falhou — compartilhe o link novamente.',
    inviteUrl: inviteRedirectUrl(token),
  });
}

async function revokeInvite(inviteId) {
  const actor = await getActor();
  assertCanManageInvites(actor);

  const invite = await Invite.get(inviteId);
  if (!invite?.id || invite.agencyId !== actor.agencyId) {
    return fail('not_found', 'Convite não encontrado');
  }
  if (invite.status === 'accepted') {
    return fail('already_accepted', 'Não é possível revogar um convite já aceito');
  }

  if (invite.membershipId) {
    await deleteTeamMembership(actor.agencyId, invite.membershipId);
  }

  await Invite.update(invite.id, {
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    revokedBy: actor.userId,
  });

  return ok({ message: 'Convite revogado com sucesso!' });
}

/**
 * Gerencia convites: list | resend | revoke
 */
export async function manageInvites({ action, inviteId } = {}) {
  switch (String(action || '').trim().toLowerCase()) {
    case 'list':
      return listInvites();
    case 'resend':
      if (!inviteId) return fail('invalid_invite', 'inviteId é obrigatório');
      return resendInvite(inviteId);
    case 'revoke':
      if (!inviteId) return fail('invalid_invite', 'inviteId é obrigatório');
      return revokeInvite(inviteId);
    default:
      return fail('invalid_action', `Ação inválida: ${action || '(vazia)'}`);
  }
}

async function upsertProfileFromInvite({ userId, email, name, agencyId, role }) {
  const existing = await Profile.get(userId).catch(() => null);
  const payload = {
    agencyId,
    role: role || 'team',
    clientId: existing?.clientId || '',
    name: name || existing?.name || email,
    email,
    full_name: name || existing?.full_name || existing?.name || email,
    status: 'active',
  };

  if (existing?.id) {
    return Profile.update(userId, payload);
  }

  return Profile.create({ id: userId, ...payload });
}

/**
 * Aceita convite. Preferencialmente com params do redirect Appwrite
 * (membershipId, userId, secret, teamId) + token do convite.
 */
export async function acceptInvite({
  token,
  membershipId,
  userId,
  secret,
  teamId,
} = {}) {
  const account = getAccount();
  let user;
  try {
    user = await account.get();
  } catch {
    return fail('unauthenticated', 'Faça login com o e-mail do convite para aceitar.');
  }

  const email = normalizeEmail(user.email);
  let joinedTeamId = teamId || null;

  if (membershipId && secret && teamId) {
    try {
      const teams = getTeams();
      await teams.updateMembershipStatus({
        teamId,
        membershipId,
        userId: userId || user.$id,
        secret,
      });
      joinedTeamId = teamId;
    } catch (error) {
      console.warn('[teamInvites] updateMembershipStatus:', error?.message || error);
    }
  }

  let invite = null;
  if (token) {
    const agencyIds = new Set([joinedTeamId, teamId].filter(Boolean));
    if (agencyIds.size === 0) {
      const readable = await Invite.filter({ email }, undefined, 50).catch(() => []);
      invite = (readable || []).find((row) => row.token === token) || null;
      if (invite?.agencyId) agencyIds.add(invite.agencyId);
    } else {
      for (const agencyId of agencyIds) {
        const rows = await listAgencyInvites(agencyId).catch(() => []);
        invite = rows.find((row) => row.token === token) || null;
        if (invite) break;
      }
    }
  }

  if (!invite && joinedTeamId) {
    const rows = await listAgencyInvites(joinedTeamId).catch(() => []);
    invite = rows.find((row) => normalizeEmail(row.email) === email && row.status === 'sent') || null;
  }

  if (!invite) {
    return fail(
      'invite_not_found',
      'Convite não encontrado. Aceite pelo link do e-mail do Appwrite ou peça um reenvio.'
    );
  }

  if (normalizeEmail(invite.email) !== email) {
    return fail('email_mismatch', 'Faça login com o mesmo e-mail do convite.');
  }

  if (invite.status === 'revoked') {
    return fail('revoked', 'Este convite foi revogado.');
  }

  if (invite.status === 'accepted') {
    const agency = await Agency.get(invite.agencyId).catch(() => null);
    return ok({
      message: 'Convite já estava aceito.',
      agencyName: agency?.agencyName || agency?.name || '',
    });
  }

  if (isExpiredInvite(invite)) {
    await Invite.update(invite.id, { status: 'expired' }).catch(() => {});
    return fail('expired', 'Este convite expirou. Peça um novo convite.');
  }

  await upsertProfileFromInvite({
    userId: user.$id,
    email,
    name: user.name,
    agencyId: invite.agencyId,
    role: invite.role || 'team',
  });

  await Invite.update(invite.id, {
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
    acceptedBy: user.$id,
  });

  const agency = await Agency.get(invite.agencyId).catch(() => null);

  return ok({
    message: 'Convite aceito com sucesso!',
    agencyName: agency?.agencyName || agency?.name || '',
    agencyId: invite.agencyId,
    role: invite.role,
  });
}

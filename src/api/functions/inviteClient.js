import { createSessionJwt } from '@/lib/appwrite';
import { createEntityAdapter } from '../appwrite/entityAdapter';

const Profile = createEntityAdapter('profiles');
const Client = createEntityAdapter('clients');

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

function portalLoginUrl() {
  if (typeof window === 'undefined') return '/client-login';
  return `${window.location.origin}/client-login`;
}

async function getActor() {
  const { authAdapter } = await import('../appwrite/authAdapter.js');
  const me = await authAdapter.me();
  return {
    userId: me.id,
    email: normalizeEmail(me.email),
    agencyId: me.agencyId || null,
    role: me.role || 'team',
  };
}

async function inviteViaApi({ clientId, email, fullName, password, sendEmail }) {
  const jwt = await createSessionJwt();
  if (!jwt) return null;

  let res;
  try {
    res = await fetch('/api/invite-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        clientId,
        email,
        fullName,
        password,
        sendEmail,
      }),
    });
  } catch (err) {
    console.warn('[inviteClient] API indisponível:', err?.message || err);
    return null;
  }

  const contentType = String(res.headers.get('content-type') || '');
  if (res.status === 404 || contentType.includes('text/html')) {
    return null;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    return fail(
      json.error || 'api_error',
      json.message || 'Não foi possível convidar o cliente.'
    );
  }

  const payload = json.data || json;
  return ok({
    alreadyExists: Boolean(payload.alreadyExists || json.alreadyExists),
    emailSent: Boolean(payload.emailSent || json.emailSent),
    message: payload.message || json.message,
    temporaryPassword: payload.temporaryPassword || json.temporaryPassword,
    email: payload.email || email,
    name: payload.name || fullName,
    userId: payload.userId || json.userId,
    clientId,
    loginUrl: payload.loginUrl || json.loginUrl || portalLoginUrl(),
  });
}

async function markClientPortalAccess(clientId) {
  try {
    await Client.update(clientId, {
      portal_enabled: true,
      has_portal_access: true,
    });
  } catch (err) {
    console.warn('[inviteClient] portal flags:', err?.message || err);
  }
}

/**
 * Convida contato do cliente ao portal (role=client + clientId).
 * Preferência: API admin; fallback: authAdapter no client SDK.
 *
 * @param {{ clientId: string, email: string, fullName?: string, name?: string, password?: string, sendEmail?: boolean }}
 */
export async function inviteClient(params = {}) {
  const clientId = String(params.clientId || '').trim();
  const email = normalizeEmail(params.email);
  const fullName = String(params.fullName || params.name || '').trim() || email.split('@')[0];
  const password = String(params.password || '').trim() || generateSharePassword();
  const sendEmail = params.sendEmail !== false;

  if (!clientId) {
    throw new Error('clientId é obrigatório');
  }
  if (!email || !isValidEmail(email)) {
    throw new Error('E-mail inválido');
  }

  const actor = await getActor();
  if (!actor.agencyId) {
    throw new Error('Agência não encontrada para o usuário atual.');
  }
  if (String(actor.role || '').toLowerCase() === 'client') {
    throw new Error('Você não tem permissão para convidar clientes.');
  }

  const client = await Client.get(clientId).catch(() => null);
  if (!client?.id) {
    throw new Error('Cliente não encontrado');
  }
  if (client.agencyId && client.agencyId !== actor.agencyId) {
    throw new Error('Cliente não pertence à sua agência');
  }

  const viaApi = await inviteViaApi({
    clientId,
    email,
    fullName,
    password,
    sendEmail,
  });
  if (viaApi) {
    if (viaApi.success === false) {
      throw new Error(viaApi.message || 'Erro ao enviar convite');
    }
    return viaApi;
  }

  // Fallback client SDK
  const agencyProfiles = await Profile.filter({ agencyId: actor.agencyId }, undefined, 200).catch(() => []);
  const sameEmail = (agencyProfiles || []).find((p) => normalizeEmail(p.email) === email);
  if (sameEmail) {
    if (
      String(sameEmail.role || '').toLowerCase() === 'client'
      && String(sameEmail.clientId || '') === clientId
    ) {
      await markClientPortalAccess(clientId);
      return ok({
        alreadyExists: true,
        emailSent: false,
        message: 'Cliente já tem acesso ao portal',
        userId: sameEmail.id,
        email,
        loginUrl: portalLoginUrl(),
      });
    }
    throw new Error('Este e-mail já está em uso nesta agência');
  }

  const { authAdapter } = await import('../appwrite/authAdapter.js');
  try {
    const created = await authAdapter.create({
      email,
      password,
      name: fullName,
      full_name: fullName,
      role: 'client',
      agencyId: actor.agencyId,
      clientId,
      status: 'active',
      isTemporaryPassword: true,
      createdBy: actor.userId,
    });

    await markClientPortalAccess(clientId);

    return ok({
      alreadyExists: false,
      emailSent: false,
      message: 'Usuário criado. Compartilhe e-mail e senha com o contato.',
      temporaryPassword: password,
      email,
      name: fullName,
      userId: created?.id,
      clientId,
      loginUrl: portalLoginUrl(),
    });
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    const code = error?.code;
    if (code === 409 || msg.includes('already') || msg.includes('exists')) {
      throw new Error(
        'Já existe uma conta Auth com este e-mail. Use outro e-mail, ou no Appwrite Console apague esse usuário e tente de novo.'
      );
    }
    console.error('[inviteClient] fallback create:', error);
    throw new Error(error?.message || 'Não foi possível criar o usuário do cliente.');
  }
}

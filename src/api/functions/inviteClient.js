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
  if (!jwt) {
    return fail(
      'no_session_jwt',
      'Não foi possível autenticar a requisição. Faça login novamente e tente o convite.'
    );
  }

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
    console.warn('[inviteClient] fetch falhou:', err?.message || err);
    return fail(
      'network_error',
      'Não foi possível alcançar /api/invite-client. Reinicie o Vite (npm run dev) e tente de novo.'
    );
  }

  const contentType = String(res.headers.get('content-type') || '');
  if (res.status === 404 || contentType.includes('text/html')) {
    const host = typeof window !== 'undefined' ? window.location.host : '';
    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
    console.warn(
      '[inviteClient] API não respondeu JSON (status=%s, content-type=%s, host=%s)',
      res.status,
      contentType,
      host
    );
    return fail(
      'api_unavailable',
      isLocal
        ? 'API de convite indisponível. Pare e rode de novo: npm run dev (em http://127.0.0.1:5173). Não use vite preview sem o plugin, nem uma aba com Service Worker antigo — limpe o SW se necessário.'
        : `API /api/invite-client ausente em ${host || 'produção'} (404 HTML). Faça redeploy no Netlify com a function invite-client e a env APPWRITE_API_KEY.`
    );
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const message =
      json.message
      || (json.error === 'appwrite_not_configured'
        || /APPWRITE_API_KEY|não configurado/i.test(String(json.message || json.error || ''))
        ? 'Appwrite admin não configurado. Defina APPWRITE_API_KEY no .env.local (local) ou nas env vars do Netlify.'
        : null)
      || 'Não foi possível convidar o cliente.';
    return fail(json.error || 'api_error', message);
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

  // Já existe profile deste e-mail para este cliente? (evita round-trip desnecessário)
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

  const viaApi = await inviteViaApi({
    clientId,
    email,
    fullName,
    password,
    sendEmail,
  });
  if (viaApi.success === false) {
    throw new Error(viaApi.message || 'Erro ao enviar convite');
  }
  return viaApi;
}

/**
 * Persistência de sessão Appwrite para PWA / fechar aba.
 * O SDK grava `cookieFallback` no localStorage; em alguns WebViews isso falha
 * ou limpa. Guardamos backup + secret (quando a API devolve) e restauramos no boot.
 */

export const EVOCTO_SESSION_SECRET_KEY = 'evocto_appwrite_session_secret';
export const EVOCTO_COOKIE_FALLBACK_BACKUP_KEY = 'evocto_cookie_fallback_backup';
const APPWRITE_COOKIE_FALLBACK_KEY = 'cookieFallback';

function safeGet(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Restaura secret/cookieFallback no Client antes de qualquer Account.get(). */
export function restoreAppwriteSession(client) {
  if (!client) return;

  const secret = safeGet(EVOCTO_SESSION_SECRET_KEY);
  if (secret && typeof client.setSession === 'function') {
    try {
      client.setSession(secret);
    } catch {
      // ignore
    }
  }

  const backup = safeGet(EVOCTO_COOKIE_FALLBACK_BACKUP_KEY);
  const current = safeGet(APPWRITE_COOKIE_FALLBACK_KEY);
  if (backup && !current) {
    safeSet(APPWRITE_COOKIE_FALLBACK_KEY, backup);
  }
}

/**
 * Após createEmailPasswordSession: grava secret (se houver) e espelha cookieFallback.
 * @param {import('appwrite').Models.Session | null | undefined} session
 */
export function persistAppwriteSession(session) {
  const secret = session?.secret;
  if (secret) {
    safeSet(EVOCTO_SESSION_SECRET_KEY, String(secret));
  }

  const fallback = safeGet(APPWRITE_COOKIE_FALLBACK_KEY);
  if (fallback) {
    safeSet(EVOCTO_COOKIE_FALLBACK_BACKUP_KEY, fallback);
  }
}

/** Espelha cookieFallback depois que o SDK processou os headers da resposta. */
export async function persistAppwriteSessionAfterTick(session) {
  persistAppwriteSession(session);
  await new Promise((r) => setTimeout(r, 0));
  persistAppwriteSession(session);
  // Mais um frame: X-Fallback-Cookies às vezes chega após o await do createSession
  await new Promise((r) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => r());
    else setTimeout(r, 16);
  });
  persistAppwriteSession(session);
}

export function clearPersistedAppwriteSession() {
  safeRemove(EVOCTO_SESSION_SECRET_KEY);
  safeRemove(EVOCTO_COOKIE_FALLBACK_BACKUP_KEY);
  safeRemove(APPWRITE_COOKIE_FALLBACK_KEY);
}

export function hasPersistedAppwriteSession() {
  return Boolean(
    safeGet(EVOCTO_SESSION_SECRET_KEY)
    || safeGet(APPWRITE_COOKIE_FALLBACK_KEY)
    || safeGet(EVOCTO_COOKIE_FALLBACK_BACKUP_KEY)
  );
}

// Utilitários para autenticação e JWT
import { AUTH_ERROR_TYPES, getAuthError } from './authErrors';

// Schema para Session (usando validação manual)
export const SessionSchema = {
  parse: (data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid session data');
    }

    const user = data.user;
    if (!user || typeof user !== 'object') {
      throw new Error('Invalid user data in session');
    }

    return {
      user: {
        id: typeof user.id === 'string' ? user.id : '',
        email: typeof user.email === 'string' ? user.email : '',
        role: typeof user.role === 'string' ? user.role : 'client',
        full_name: typeof user.full_name === 'string' ? user.full_name : '',
        agencyId: user.agencyId || null
      },
      accessToken: typeof data.accessToken === 'string' ? data.accessToken : '',
      refreshToken: typeof data.refreshToken === 'string' ? data.refreshToken : '',
      expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : new Date().toISOString()
    };
  },

  safeParse: (data) => {
    try {
      return { success: true, data: SessionSchema.parse(data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Função para parsing seguro de sessão
export function parseSessionOrNull(input) {
  if (!input) return null;
  
  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    const result = SessionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (error) {
    console.warn('Failed to parse session:', error);
    return null;
  }
}

// Verificar se JWT está expirado (com clock skew de 60s)
export function isJwtExpired(token) {
  if (!token || typeof token !== 'string') {
    return true;
  }

  try {
    // Parse JWT payload (assumindo formato padrão)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp || typeof exp !== 'number') {
      return true;
    }

    // Verificar com clock skew de 60 segundos
    const now = Math.floor(Date.now() / 1000);
    const clockSkew = 60;
    
    return exp <= (now + clockSkew);
  } catch (error) {
    console.warn('Failed to decode JWT:', error);
    return true;
  }
}

// Verificar se sessão está expirada ou expirando em breve
export function isSessionExpired(session) {
  if (!session) return true;
  
  try {
    const expiresAt = new Date(session.expiresAt);
    const now = new Date();
    const clockSkew = 60 * 1000; // 60 segundos em ms
    
    return expiresAt.getTime() <= (now.getTime() + clockSkew);
  } catch (error) {
    return true;
  }
}

// Função para chamadas seguras
export function safeCall(fn, ...args) {
  if (typeof fn === 'function') {
    try {
      return { ok: true, result: fn(...args) };
    } catch (error) {
      return { ok: false, error: error.message || 'FUNCTION_CALL_ERROR' };
    }
  }
  return { ok: false, error: 'FN_UNDEFINED' };
}

// Função para chamadas assíncronas seguras
export async function safeCallAsync(fn, ...args) {
  if (typeof fn === 'function') {
    try {
      const result = await fn(...args);
      return { ok: true, result };
    } catch (error) {
      return { ok: false, error: error.message || 'ASYNC_FUNCTION_CALL_ERROR' };
    }
  }
  return { ok: false, error: 'FN_UNDEFINED' };
}

// Storage seguro
export const secureStorage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Failed to write to localStorage:', error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  }
};

// Event emitter simples para auth events
class AuthEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event, listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Auth event listener error:', error);
      }
    });
  }
}

export const authEvents = new AuthEventEmitter();
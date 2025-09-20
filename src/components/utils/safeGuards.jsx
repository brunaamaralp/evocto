
/**
 * Guardas de segurança para prevenir erros comuns
 */

// Safe getter que nunca quebra
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    if (!obj || typeof obj !== 'object') return defaultValue;
    
    const keys = Array.isArray(path) ? path : path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined || !(key in result)) {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
  } catch (error) {
    console.warn('SafeGet error:', error);
    return defaultValue;
  }
};

// Wrapper com valor padrão
export const withDefault = (value, defaultValue) => {
  return value !== null && value !== undefined ? value : defaultValue;
};

/**
 * Wrapper seguro para funções que podem não existir
 */
export function safeCall(fn, fallback = () => {}, ...args) {
  try {
    if (typeof fn === 'function') {
      return fn(...args);
    } else {
      console.warn('[safeCall] Function is not defined:', fn);
      return fallback(...args);
    }
  } catch (error) {
    console.error('[safeCall] Error calling function:', error);
    return fallback(...args);
  }
}

// Safe async function call
export const safeCallAsync = async (fn, defaultReturn = null, ...args) => {
  try {
    if (typeof fn === 'function') {
      return await fn(...args);
    }
    return defaultReturn;
  } catch (error) {
    console.warn('SafeCallAsync error:', error);
    return defaultReturn;
  }
};

// Safe JSON parsing
export const safeParseJSON = (jsonString, defaultValue = null) => {
  try {
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString);
    }
    return jsonString || defaultValue;
  } catch (error) {
    console.warn('SafeParseJSON error:', error);
    return defaultValue;
  }
};

// Safe feature checking - PRINCIPAL CORREÇÃO PARA O ERRO
export const hasFeature = (user, agency, featureName) => {
  try {
    if (!user || !featureName) return false;
    
    // Verificar se a agência tem configuração específica
    const agencyFeatures = safeGet(agency, 'feature_flags', {});
    if (agencyFeatures.hasOwnProperty(featureName)) {
      return agencyFeatures[featureName];
    }
    
    // Fallback para configuração padrão por role
    const userRole = user.role || 'client';
    const defaultFeatures = {
      owner: { advanced_analytics: true, content_helper: true, beta_features: true },
      admin: { advanced_analytics: true, content_helper: true, beta_features: false },
      team: { advanced_analytics: false, content_helper: true, beta_features: false },
      client: { advanced_analytics: false, content_helper: false, beta_features: false }
    };
    
    const roleFeatures = defaultFeatures[userRole] || defaultFeatures.client;
    return roleFeatures[featureName] || false;
  } catch (error) {
    console.warn('hasFeature error:', error);
    return false;
  }
};

// Safe array operations
export const safeMap = (array, mapFn, defaultValue = []) => {
  try {
    if (Array.isArray(array)) {
      return array.map(mapFn);
    }
    return defaultValue;
  } catch (error) {
    console.warn('SafeMap error:', error);
    return defaultValue;
  }
};

export const safeFilter = (array, filterFn, defaultValue = []) => {
  try {
    if (Array.isArray(array)) {
      return array.filter(filterFn);
    }
    return defaultValue;
  } catch (error) {
    console.warn('SafeFilter error:', error);
    return defaultValue;
  }
};

// Safe string operations
export const safeString = (value, defaultValue = '') => {
  try {
    if (typeof value === 'string') return value;
    if (value !== null && value !== undefined) return String(value);
    return defaultValue;
  } catch (error) {
    console.warn('SafeString error:', error);
    return defaultValue;
  }
};

// Safe number operations  
export const safeNumber = (value, defaultValue = 0) => {
  try {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  } catch (error) {
    console.warn('SafeNumber error:', error);
    return defaultValue;
  }
};

// Safe boolean operations
export const safeBoolean = (value, defaultValue = false) => {
  try {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value) || defaultValue;
  } catch (error) {
    console.warn('SafeBoolean error:', error);
    return defaultValue;
  }
};

// Função para evitar quebras em componentes
export const withErrorBoundary = (Component, FallbackComponent = null) => {
  return function SafeComponent(props) {
    try {
      return <Component {...props} />;
    } catch (error) {
      console.error('Component error:', error);
      return FallbackComponent ? <FallbackComponent error={error} /> : null;
    }
  };
};

/**
 * Safe import wrapper para imports dinâmicos
 */
export async function safeImport(modulePath, fallback = {}) {
  try {
    const module = await import(modulePath);
    return module || fallback;
  } catch (error) {
    console.warn(`[safeImport] Failed to import ${modulePath}:`, error);
    return fallback;
  }
}

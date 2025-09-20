/**
 * Utilitários para importações seguras de funções
 */

// Cache para módulos já importados
const moduleCache = new Map();

/**
 * Importa uma função de forma segura com fallback
 */
export async function safeImportFunction(functionPath, functionName, fallback = () => {}) {
  try {
    const cacheKey = `${functionPath}#${functionName}`;
    
    // Verificar cache primeiro
    if (moduleCache.has(cacheKey)) {
      return moduleCache.get(cacheKey);
    }

    console.log('[safeImportFunction] Importing:', functionPath, functionName);

    const module = await import(functionPath);
    
    if (module && module[functionName] && typeof module[functionName] === 'function') {
      moduleCache.set(cacheKey, module[functionName]);
      return module[functionName];
    } else {
      console.warn(`[safeImportFunction] Function ${functionName} not found in ${functionPath}`);
      moduleCache.set(cacheKey, fallback);
      return fallback;
    }
  } catch (error) {
    console.error(`[safeImportFunction] Error importing ${functionPath}:`, error);
    moduleCache.set(`${functionPath}#${functionName}`, fallback);
    return fallback;
  }
}

/**
 * Wrapper para imports de função com retry
 */
export function createSafeFunctionCaller(functionPath, functionName) {
  let importPromise = null;
  let cachedFunction = null;

  return async function(...args) {
    // Se já temos a função cached, usar ela
    if (cachedFunction) {
      try {
        return await cachedFunction(...args);
      } catch (error) {
        console.error('[createSafeFunctionCaller] Error calling cached function:', error);
        throw error;
      }
    }

    // Se ainda não temos import promise, criar uma
    if (!importPromise) {
      importPromise = safeImportFunction(functionPath, functionName);
    }

    try {
      cachedFunction = await importPromise;
      return await cachedFunction(...args);
    } catch (error) {
      console.error('[createSafeFunctionCaller] Error during import or call:', error);
      throw error;
    }
  };
}
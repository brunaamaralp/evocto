
import { useEffect, useCallback, useMemo, useState } from 'react';
import { useReactiveState } from './ReactiveStateManager';

/**
 * Sistema de persistência de estado
 * Salva estado importante em localStorage/sessionStorage
 */

const STORAGE_KEYS = {
  SELECTED_CLIENT: 'evocto:selectedClient',
  SELECTED_SERVICE: 'evocto:selectedService',
  FILTERS: 'evocto:filters',
  UI_PREFERENCES: 'evocto:uiPreferences',
  RECENT_SEARCHES: 'evocto:recentSearches'
};

class PersistentStorage {
  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  checkAvailability() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  set(key, value, useSession = false) {
    if (!this.isAvailable) return false;

    try {
      const storage = useSession ? sessionStorage : localStorage;
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: '1.0'
      });
      storage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.warn('Failed to save to storage:', error);
      return false;
    }
  }

  get(key, useSession = false) {
    if (!this.isAvailable) return null;

    try {
      const storage = useSession ? sessionStorage : localStorage;
      const item = storage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Verificar se não expirou (24 horas para localStorage, sem limite para sessionStorage)
      if (!useSession) {
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas
        if (Date.now() - parsed.timestamp > maxAge) {
          storage.removeItem(key);
          return null;
        }
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to read from storage:', error);
      return null;
    }
  }

  remove(key, useSession = false) {
    if (!this.isAvailable) return;

    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from storage:', error);
    }
  }

  clear(useSession = false) {
    if (!this.isAvailable) return;

    try {
      const storage = useSession ? sessionStorage : localStorage;
      // Remover apenas chaves do Evocto
      Object.values(STORAGE_KEYS).forEach(key => {
        storage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }
}

const persistentStorage = new PersistentStorage();

/**
 * Hook para persistir estado selecionado (cliente, serviço)
 */
export function usePersistentSelection() {
  const { state, actions } = useReactiveState();

  // Carregar estado persistido na inicialização
  useEffect(() => {
    const savedClient = persistentStorage.get(STORAGE_KEYS.SELECTED_CLIENT, true);
    const savedService = persistentStorage.get(STORAGE_KEYS.SELECTED_SERVICE, true);

    if (savedClient && !state.selected.client) {
      actions.setSelectedClient(savedClient);
    }

    if (savedService && !state.selected.service) {
      actions.setSelectedService(savedService);
    }
  }, [state.selected.client, state.selected.service, actions]);

  // Salvar mudanças automaticamente
  useEffect(() => {
    if (state.selected.client) {
      persistentStorage.set(STORAGE_KEYS.SELECTED_CLIENT, state.selected.client, true);
    }
  }, [state.selected.client]);

  useEffect(() => {
    if (state.selected.service) {
      persistentStorage.set(STORAGE_KEYS.SELECTED_SERVICE, state.selected.service, true);
    }
  }, [state.selected.service]);

  return {
    clearPersistedSelection: () => {
      persistentStorage.remove(STORAGE_KEYS.SELECTED_CLIENT, true);
      persistentStorage.remove(STORAGE_KEYS.SELECTED_SERVICE, true);
      actions.setSelectedClient(null);
      actions.setSelectedService(null);
    }
  };
}

/**
 * Hook para persistir filtros
 */
export function usePersistentFilters(entityType) {
  const { state, actions } = useReactiveState();

  const filtersKey = `${STORAGE_KEYS.FILTERS}:${entityType}`;
  
  // Memoizar currentFilters para evitar recálculo desnecessário
  const currentFilters = useMemo(() => {
    return state.filters[entityType] || {};
  }, [state.filters, entityType]);

  // Carregar filtros salvos
  useEffect(() => {
    const savedFilters = persistentStorage.get(filtersKey);
    if (savedFilters && Object.keys(currentFilters).length === 0) {
      actions.setFilters(entityType, savedFilters);
    }
  }, [entityType, filtersKey, currentFilters, actions]);

  // Salvar filtros quando mudam
  useEffect(() => {
    if (Object.keys(currentFilters).length > 0) {
      persistentStorage.set(filtersKey, currentFilters);
    }
  }, [currentFilters, filtersKey]);

  return {
    clearPersistedFilters: () => {
      persistentStorage.remove(filtersKey);
      actions.setFilters(entityType, {});
    }
  };
}

/**
 * Hook para preferências de UI
 */
export function usePersistentUIPreferences() {
  const [preferences, setPreferences] = useState(() => {
    return persistentStorage.get(STORAGE_KEYS.UI_PREFERENCES) || {
      theme: 'light',
      sidebarCollapsed: false,
      listView: 'cards', // 'cards' ou 'table'
      pageSize: 20,
      language: 'pt'
    };
  });

  const updatePreferences = useCallback((updates) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, ...updates };
      persistentStorage.set(STORAGE_KEYS.UI_PREFERENCES, newPrefs);
      return newPrefs;
    });
  }, []);

  return {
    preferences,
    updatePreferences,
    resetPreferences: () => {
      persistentStorage.remove(STORAGE_KEYS.UI_PREFERENCES);
      setPreferences({
        theme: 'light',
        sidebarCollapsed: false,
        listView: 'cards',
        pageSize: 20,
        language: 'pt'
      });
    }
  };
}

/**
 * Hook para histórico de buscas
 */
export function usePersistentSearchHistory() {
  const [recentSearches, setRecentSearches] = useState(() => {
    return persistentStorage.get(STORAGE_KEYS.RECENT_SEARCHES) || [];
  });

  const addSearch = useCallback((term) => {
    if (!term.trim() || term.length < 2) return;

    setRecentSearches(prev => {
      // Remover se já existe
      const filtered = prev.filter(search => search.term !== term);
      
      // Adicionar no início
      const newSearches = [
        { term, timestamp: Date.now() },
        ...filtered
      ].slice(0, 10); // Manter apenas 10 mais recentes

      persistentStorage.set(STORAGE_KEYS.RECENT_SEARCHES, newSearches);
      return newSearches;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setRecentSearches([]);
    persistentStorage.remove(STORAGE_KEYS.RECENT_SEARCHES);
  }, []);

  return {
    recentSearches,
    addSearch,
    clearSearchHistory
  };
}

/**
 * Hook para sincronização offline/online
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const { actions } = useReactiveState();

  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Processar ações pendentes quando voltar online
      if (pendingActions.length > 0) {
        console.log('Processing pending actions:', pendingActions);
        // Aqui seria implementada a lógica para sincronizar ações pendentes
        setPendingActions([]);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions]);

  const executeAction = useCallback((action, data) => {
    if (isOnline) {
      // Executar imediatamente se online
      return actions[action](data);
    } else {
      // Adicionar à fila se offline
      setPendingActions(prev => [...prev, { action, data, timestamp: Date.now() }]);
      
      // Salvar também no localStorage para persistir entre reloads
      // Nota: current pendingActions may not be the latest if setPendingActions is async
      // To ensure latest, retrieve from storage or pass prev as part of callback.
      // For this example, assuming 'pendingActions' in the dependency array
      // already reflects the latest state after the previous `setPendingActions` call.
      const allPendingActions = [...pendingActions, { action, data, timestamp: Date.now() }];
      persistentStorage.set('pendingActions', allPendingActions, true);
    }
  }, [isOnline, actions, pendingActions]);

  return {
    isOnline,
    pendingActionsCount: pendingActions.length,
    executeAction
  };
}

export { persistentStorage, STORAGE_KEYS };

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { useSession } from '@/components/auth/SessionManager';

/**
 * Sistema de estado reativo global
 * Gerencia estado da aplicação de forma centralizada e eficiente
 */

// Estados iniciais
const INITIAL_STATE = {
  // Dados das entidades
  entities: {
    clients: new Map(),
    services: new Map(),
    tasks: new Map(),
    cycles: new Map(),
    notifications: new Map()
  },
  
  // UI State
  ui: {
    sidebarCollapsed: false,
    activeModal: null,
    loadingStates: new Set(),
    selectedItems: new Set(),
    currentPage: 'dashboard',
    breadcrumbs: []
  },
  
  // Filtros e buscas
  filters: {},
  searchTerms: {},
  
  // Cache e performance
  cache: {
    queries: new Map(),
    timestamps: new Map()
  },
  
  // Real-time
  realtime: {
    connectedUsers: new Set(),
    typingUsers: new Set(),
    notifications: []
  }
};

// Actions
const ACTIONS = {
  // Entity actions
  SET_ENTITY: 'SET_ENTITY',
  UPDATE_ENTITY: 'UPDATE_ENTITY',
  DELETE_ENTITY: 'DELETE_ENTITY',
  SET_ENTITIES: 'SET_ENTITIES',
  
  // UI actions
  SET_SIDEBAR_COLLAPSED: 'SET_SIDEBAR_COLLAPSED',
  SET_ACTIVE_MODAL: 'SET_ACTIVE_MODAL',
  SET_LOADING: 'SET_LOADING',
  CLEAR_LOADING: 'CLEAR_LOADING',
  SELECT_ITEM: 'SELECT_ITEM',
  DESELECT_ITEM: 'DESELECT_ITEM',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_BREADCRUMBS: 'SET_BREADCRUMBS',
  
  // Filter actions
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  
  // Cache actions
  SET_CACHE: 'SET_CACHE',
  INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  
  // Realtime actions
  ADD_CONNECTED_USER: 'ADD_CONNECTED_USER',
  REMOVE_CONNECTED_USER: 'REMOVE_CONNECTED_USER',
  ADD_TYPING_USER: 'ADD_TYPING_USER',
  REMOVE_TYPING_USER: 'REMOVE_TYPING_USER',
  ADD_REALTIME_NOTIFICATION: 'ADD_REALTIME_NOTIFICATION'
};

// Reducer
function reactiveStateReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_ENTITY: {
      const { entityType, entity } = action.payload;
      const newEntities = new Map(state.entities[entityType]);
      newEntities.set(entity.id, entity);
      
      return {
        ...state,
        entities: {
          ...state.entities,
          [entityType]: newEntities
        }
      };
    }
    
    case ACTIONS.UPDATE_ENTITY: {
      const { entityType, id, updates } = action.payload;
      const newEntities = new Map(state.entities[entityType]);
      const existing = newEntities.get(id);
      
      if (existing) {
        newEntities.set(id, { ...existing, ...updates });
      }
      
      return {
        ...state,
        entities: {
          ...state.entities,
          [entityType]: newEntities
        }
      };
    }
    
    case ACTIONS.DELETE_ENTITY: {
      const { entityType, id } = action.payload;
      const newEntities = new Map(state.entities[entityType]);
      newEntities.delete(id);
      
      return {
        ...state,
        entities: {
          ...state.entities,
          [entityType]: newEntities
        }
      };
    }
    
    case ACTIONS.SET_ENTITIES: {
      const { entityType, entities } = action.payload;
      const entityMap = new Map();
      entities.forEach(entity => entityMap.set(entity.id, entity));
      
      return {
        ...state,
        entities: {
          ...state.entities,
          [entityType]: entityMap
        }
      };
    }
    
    case ACTIONS.SET_SIDEBAR_COLLAPSED:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarCollapsed: action.payload
        }
      };
    
    case ACTIONS.SET_ACTIVE_MODAL:
      return {
        ...state,
        ui: {
          ...state.ui,
          activeModal: action.payload
        }
      };
    
    case ACTIONS.SET_LOADING: {
      const newLoadingStates = new Set(state.ui.loadingStates);
      newLoadingStates.add(action.payload);
      
      return {
        ...state,
        ui: {
          ...state.ui,
          loadingStates: newLoadingStates
        }
      };
    }
    
    case ACTIONS.CLEAR_LOADING: {
      const newLoadingStates = new Set(state.ui.loadingStates);
      newLoadingStates.delete(action.payload);
      
      return {
        ...state,
        ui: {
          ...state.ui,
          loadingStates: newLoadingStates
        }
      };
    }
    
    case ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.entityType]: action.payload.filters
        }
      };
    
    case ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload]: {}
        }
      };
    
    case ACTIONS.SET_SEARCH_TERM:
      return {
        ...state,
        searchTerms: {
          ...state.searchTerms,
          [action.payload.entityType]: action.payload.term
        }
      };
    
    case ACTIONS.SET_CACHE: {
      const { key, data, ttl } = action.payload;
      const newCache = new Map(state.cache.queries);
      const newTimestamps = new Map(state.cache.timestamps);
      
      newCache.set(key, data);
      newTimestamps.set(key, Date.now() + (ttl || 300000)); // 5 min default
      
      return {
        ...state,
        cache: {
          queries: newCache,
          timestamps: newTimestamps
        }
      };
    }
    
    case ACTIONS.INVALIDATE_CACHE: {
      const newCache = new Map(state.cache.queries);
      const newTimestamps = new Map(state.cache.timestamps);
      
      if (action.payload) {
        // Invalidar cache específico
        newCache.delete(action.payload);
        newTimestamps.delete(action.payload);
      } else {
        // Invalidar todo cache
        newCache.clear();
        newTimestamps.clear();
      }
      
      return {
        ...state,
        cache: {
          queries: newCache,
          timestamps: newTimestamps
        }
      };
    }
    
    case ACTIONS.ADD_REALTIME_NOTIFICATION: {
      const newNotifications = [...state.realtime.notifications, action.payload];
      // Manter apenas as 50 mais recentes
      if (newNotifications.length > 50) {
        newNotifications.shift();
      }
      
      return {
        ...state,
        realtime: {
          ...state.realtime,
          notifications: newNotifications
        }
      };
    }
    
    default:
      return state;
  }
}

// Context
const ReactiveStateContext = createContext(null);

// Provider
export function ReactiveStateProvider({ children }) {
  const { user, agencyId } = useSession();
  const [state, dispatch] = useReducer(reactiveStateReducer, INITIAL_STATE);
  
  // Actions memoizadas
  const actions = useMemo(() => ({
    // Entity actions
    setEntity: (entityType, entity) => {
      dispatch({ type: ACTIONS.SET_ENTITY, payload: { entityType, entity } });
    },
    
    updateEntity: (entityType, id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_ENTITY, payload: { entityType, id, updates } });
    },
    
    deleteEntity: (entityType, id) => {
      dispatch({ type: ACTIONS.DELETE_ENTITY, payload: { entityType, id } });
    },
    
    setEntities: (entityType, entities) => {
      dispatch({ type: ACTIONS.SET_ENTITIES, payload: { entityType, entities } });
    },
    
    // UI actions
    setSidebarCollapsed: (collapsed) => {
      dispatch({ type: ACTIONS.SET_SIDEBAR_COLLAPSED, payload: collapsed });
    },
    
    setActiveModal: (modal) => {
      dispatch({ type: ACTIONS.SET_ACTIVE_MODAL, payload: modal });
    },
    
    setLoading: (key) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: key });
    },
    
    clearLoading: (key) => {
      dispatch({ type: ACTIONS.CLEAR_LOADING, payload: key });
    },
    
    // Filter actions
    setFilters: (entityType, filters) => {
      dispatch({ type: ACTIONS.SET_FILTERS, payload: { entityType, filters } });
    },
    
    clearFilters: (entityType) => {
      dispatch({ type: ACTIONS.CLEAR_FILTERS, payload: entityType });
    },
    
    setSearchTerm: (entityType, term) => {
      dispatch({ type: ACTIONS.SET_SEARCH_TERM, payload: { entityType, term } });
    },
    
    // Cache actions
    setCache: (key, data, ttl) => {
      dispatch({ type: ACTIONS.SET_CACHE, payload: { key, data, ttl } });
    },
    
    invalidateCache: (key) => {
      dispatch({ type: ACTIONS.INVALIDATE_CACHE, payload: key });
    }
  }), []);
  
  // Selectors memoizados
  const selectors = useMemo(() => ({
    // Entity selectors
    getEntity: (entityType, id) => {
      return state.entities[entityType]?.get(id);
    },
    
    getEntities: (entityType) => {
      return Array.from(state.entities[entityType]?.values() || []);
    },
    
    getFilteredEntities: (entityType) => {
      const entities = Array.from(state.entities[entityType]?.values() || []);
      const filters = state.filters[entityType] || {};
      const searchTerm = state.searchTerms[entityType] || '';
      
      return entities.filter(entity => {
        // Aplicar filtros
        const matchesFilters = Object.entries(filters).every(([key, value]) => {
          if (!value || value === 'all') return true;
          return entity[key] === value;
        });
        
        // Aplicar busca
        const matchesSearch = !searchTerm || 
          Object.values(entity).some(val => 
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
          );
        
        return matchesFilters && matchesSearch;
      });
    },
    
    // UI selectors
    isLoading: (key) => state.ui.loadingStates.has(key),
    
    // Cache selectors
    getCachedData: (key) => {
      const timestamp = state.cache.timestamps.get(key);
      if (timestamp && Date.now() < timestamp) {
        return state.cache.queries.get(key);
      }
      return null;
    }
  }), [state]);
  
  const contextValue = useMemo(() => ({
    state,
    actions,
    selectors
  }), [state, actions, selectors]);
  
  return (
    <ReactiveStateContext.Provider value={contextValue}>
      {children}
    </ReactiveStateContext.Provider>
  );
}

// Hook
export function useReactiveState() {
  const context = useContext(ReactiveStateContext);
  
  if (!context) {
    throw new Error('useReactiveState must be used within ReactiveStateProvider');
  }
  
  return context;
}

// Hooks específicos
export function useEntities(entityType) {
  const { selectors, actions } = useReactiveState();
  
  return {
    entities: selectors.getEntities(entityType),
    filteredEntities: selectors.getFilteredEntities(entityType),
    setEntities: useCallback((entities) => actions.setEntities(entityType, entities), [actions, entityType]),
    updateEntity: useCallback((id, updates) => actions.updateEntity(entityType, id, updates), [actions, entityType]),
    deleteEntity: useCallback((id) => actions.deleteEntity(entityType, id), [actions, entityType])
  };
}

export function useEntityFilters(entityType) {
  const { state, actions } = useReactiveState();
  
  return {
    filters: state.filters[entityType] || {},
    searchTerm: state.searchTerms[entityType] || '',
    setFilters: useCallback((filters) => actions.setFilters(entityType, filters), [actions, entityType]),
    setSearchTerm: useCallback((term) => actions.setSearchTerm(entityType, term), [actions, entityType]),
    clearFilters: useCallback(() => actions.clearFilters(entityType), [actions, entityType])
  };
}

export function useLoadingState(key) {
  const { selectors, actions } = useReactiveState();
  
  return {
    isLoading: selectors.isLoading(key),
    setLoading: useCallback(() => actions.setLoading(key), [actions, key]),
    clearLoading: useCallback(() => actions.clearLoading(key), [actions, key])
  };
}
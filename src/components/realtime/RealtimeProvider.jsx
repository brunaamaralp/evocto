
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { cacheUtils } from '@/components/performance/CacheManager';

/**
 * Sistema de comunicação real-time com WebSockets
 * Sincroniza dados automaticamente entre usuários
 */

// Estados de conexão
export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting', 
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

// Tipos de eventos real-time
export const REALTIME_EVENTS = {
  // Entidades
  ENTITY_CREATED: 'entity:created',
  ENTITY_UPDATED: 'entity:updated', 
  ENTITY_DELETED: 'entity:deleted',
  
  // Tarefas
  TASK_STATUS_CHANGED: 'task:status_changed',
  TASK_ASSIGNED: 'task:assigned',
  TASK_COMMENT_ADDED: 'task:comment_added',
  
  // Aprovações
  APPROVAL_REQUESTED: 'approval:requested',
  APPROVAL_RESOLVED: 'approval:resolved',
  
  // Notificações
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  
  // Presença
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_TYPING: 'user:typing',
  
  // Sistema
  SYSTEM_UPDATE: 'system:update',
  MAINTENANCE_MODE: 'maintenance:mode'
};

class RealtimeManager {
  constructor() {
    this.ws = null;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Começa com 1 segundo
    this.maxReconnectDelay = 30000; // Máximo 30 segundos
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    this.agencyId = null;
    this.userId = null;
  }

  connect(agencyId, userId) {
    if (this.connectionState === CONNECTION_STATES.CONNECTED || 
        this.connectionState === CONNECTION_STATES.CONNECTING) {
      return;
    }

    this.agencyId = agencyId;
    this.userId = userId;
    this.connectionState = CONNECTION_STATES.CONNECTING;
    this.notifyListeners('connectionStateChange', this.connectionState);

    try {
      // Construir URL do WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/realtime?agencyId=${agencyId}&userId=${userId}`;

      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.connectionState = CONNECTION_STATES.ERROR;
      this.notifyListeners('connectionStateChange', this.connectionState);
      this.scheduleReconnect();
    }
  }

  handleOpen() {
    console.log('WebSocket connected');
    this.connectionState = CONNECTION_STATES.CONNECTED;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    this.notifyListeners('connectionStateChange', this.connectionState);
    this.startHeartbeat();
    
    // Enviar identificação
    this.send({
      type: 'identify',
      payload: {
        agencyId: this.agencyId,
        userId: this.userId,
        timestamp: Date.now()
      }
    });
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.processMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, event.data);
    }
  }

  handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason);
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.notifyListeners('connectionStateChange', this.connectionState);
    this.stopHeartbeat();
    
    // Tentar reconectar se não foi um fechamento intencional
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    this.connectionState = CONNECTION_STATES.ERROR;
    this.notifyListeners('connectionStateChange', this.connectionState);
  }

  processMessage(message) {
    const { type, payload, timestamp } = message;
    
    // Atualizar último heartbeat
    if (type === 'heartbeat') {
      this.lastHeartbeat = Date.now();
      return;
    }
    
    // Log para debug
    console.log('Received realtime message:', type, payload);
    
    // Processar eventos específicos
    switch (type) {
      case REALTIME_EVENTS.ENTITY_CREATED:
      case REALTIME_EVENTS.ENTITY_UPDATED:
      case REALTIME_EVENTS.ENTITY_DELETED:
        this.handleEntityEvent(type, payload);
        break;
        
      case REALTIME_EVENTS.TASK_STATUS_CHANGED:
      case REALTIME_EVENTS.TASK_ASSIGNED:
        this.handleTaskEvent(type, payload);
        break;
        
      case REALTIME_EVENTS.NOTIFICATION_NEW:
        this.handleNotificationEvent(type, payload);
        break;
        
      case REALTIME_EVENTS.USER_ONLINE:
      case REALTIME_EVENTS.USER_OFFLINE:
        this.handlePresenceEvent(type, payload);
        break;
    }
    
    // Notificar todos os listeners
    this.notifyListeners(type, payload);
  }

  handleEntityEvent(type, payload) {
    const { entityType, entityId, data } = payload;
    
    // Invalidar cache relacionado
    const cacheKeys = [
      `${entityType}:${entityId}`,
      `${entityType}:list`,
      `${entityType}:filter:${this.agencyId}`
    ];
    
    cacheKeys.forEach(key => cacheUtils.delete(key));
    
    // Trigger re-render de componentes que dependem desta entidade
    window.dispatchEvent(new CustomEvent('entity-updated', {
      detail: { entityType, entityId, data, type }
    }));
  }

  handleTaskEvent(type, payload) {
    const { taskId, clientId, serviceId } = payload;
    
    // Invalidar cache de tarefas
    const taskCacheKeys = [
      `tasks:${taskId}`,
      `tasks:client:${clientId}`,
      `tasks:service:${serviceId}`,
      'tasks:list'
    ];
    
    taskCacheKeys.forEach(key => cacheUtils.delete(key));
    
    // Dispatch evento personalizado
    window.dispatchEvent(new CustomEvent('task-updated', {
      detail: { taskId, type: type.replace('task:', ''), payload }
    }));
  }

  handleNotificationEvent(type, payload) {
    // Trigger atualização de notificações
    window.dispatchEvent(new CustomEvent('notification-received', {
      detail: payload
    }));
    
    // Invalidar cache de notificações
    cacheUtils.delete(`notifications:${this.userId}`);
  }

  handlePresenceEvent(type, payload) {
    // Atualizar estado de presença de usuários
    window.dispatchEvent(new CustomEvent('user-presence-changed', {
      detail: { type: type.replace('user:', ''), ...payload }
    }));
  }

  send(message) {
    if (this.connectionState === CONNECTION_STATES.CONNECTED && this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    
    // Retornar função de unsubscribe
    return () => {
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  notifyListeners(eventType, payload) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error('Error in realtime listener:', error);
        }
      });
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState === CONNECTION_STATES.CONNECTED) {
        this.send({ type: 'heartbeat', timestamp: Date.now() });
        
        // Verificar se recebemos heartbeat recente do servidor
        if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > 30000) {
          console.warn('No heartbeat from server, connection may be stale');
        }
      }
    }, 15000); // A cada 15 segundos
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionState = CONNECTION_STATES.ERROR;
      this.notifyListeners('connectionStateChange', this.connectionState);
      return;
    }

    this.connectionState = CONNECTION_STATES.RECONNECTING;
    this.notifyListeners('connectionStateChange', this.connectionState);

    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect(this.agencyId, this.userId);
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.listeners.clear();
  }

  getConnectionState() {
    return this.connectionState;
  }
}

// Instância global
const realtimeManager = new RealtimeManager();

// Context
const RealtimeContext = createContext({
  connectionState: CONNECTION_STATES.DISCONNECTED,
  subscribe: () => () => {},
  send: () => {},
  isConnected: false
});

/**
 * Provider para sistema real-time
 */
export function RealtimeProvider({ children }) {
  const { user, agencyId, isAuthenticated } = useSession();
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const mountedRef = useRef(true);

  // Conectar quando usuário estiver autenticado
  useEffect(() => {
    if (isAuthenticated && user?.id && agencyId) {
      const handleConnectionStateChange = (state) => {
        if (mountedRef.current) {
          setConnectionState(state);
        }
      };

      const unsubscribe = realtimeManager.subscribe('connectionStateChange', handleConnectionStateChange);
      realtimeManager.connect(agencyId, user.id);

      return () => {
        unsubscribe();
      };
    }
  }, [isAuthenticated, user?.id, agencyId]);

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      realtimeManager.disconnect();
    };
  }, []);

  const contextValue = {
    connectionState,
    isConnected: connectionState === CONNECTION_STATES.CONNECTED,
    subscribe: realtimeManager.subscribe.bind(realtimeManager),
    send: realtimeManager.send.bind(realtimeManager)
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook para usar sistema real-time
 */
export function useRealtime() {
  const context = useContext(RealtimeContext);
  
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  
  return context;
}

/**
 * Hook para subscrever eventos específicos
 */
export function useRealtimeEvent(eventType, callback, deps = []) {
  const { subscribe } = useRealtime();
  
  // Usar useCallback para estabilizar callback
  const stableCallback = useCallback(callback, deps);
  
  useEffect(() => {
    const unsubscribe = subscribe(eventType, stableCallback);
    return unsubscribe;
  }, [subscribe, eventType, stableCallback]);
}

/**
 * Hook para presença de usuários
 */
export function useUserPresence() {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  // Use useCallback to stabilize callbacks passed to useRealtimeEvent
  const handleUserOnline = useCallback((payload) => {
    setOnlineUsers(prev => new Set(prev).add(payload.userId));
  }, []);

  const handleUserOffline = useCallback((payload) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(payload.userId);
      return newSet;
    });
  }, []);

  useRealtimeEvent(REALTIME_EVENTS.USER_ONLINE, handleUserOnline);
  useRealtimeEvent(REALTIME_EVENTS.USER_OFFLINE, handleUserOffline);
  
  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline: (userId) => onlineUsers.has(userId)
  };
}

export { realtimeManager };
export default RealtimeProvider;

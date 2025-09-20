
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { cachedApiCall } from '@/components/utils/apiCache';

/**
 * Hook para gerenciar deep-links com proteção contra loops infinitos
 */
export function useDeepLink(entityType, entityId, options = {}) {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [context, setContext] = useState({});

  // Refs para controle de execução
  const executionRef = useRef({
    isExecuting: false,
    lastEntityId: null,
    lastEntityType: null,
    executionCount: 0
  });

  const {
    prefetchRelations = true,
    validatePermissions = true,
    onError,
    onSuccess
  } = options;

  // Memoizar callbacks para evitar re-execuções
  const stableOnError = useCallback((err) => {
    onError?.(err);
  }, [onError]);

  const stableOnSuccess = useCallback((entityData, contextData) => {
    onSuccess?.(entityData, contextData);
  }, [onSuccess]);

  useEffect(() => {
    // Verificar se já está executando ou se é a mesma entidade
    const execution = executionRef.current;
    
    if (execution.isExecuting) {
      console.log(`[useDeepLink] Already executing, skipping...`);
      return;
    }

    if (execution.lastEntityId === entityId && execution.lastEntityType === entityType && data) {
      console.log(`[useDeepLink] Same entity already loaded, skipping...`);
      return;
    }

    if (!user || !agencyId || !entityId) {
      setLoading(false);
      return;
    }

    // Incrementar contador de execução para debug
    execution.executionCount++;
    console.log(`[useDeepLink] Execution #${execution.executionCount} for ${entityType}:${entityId}`);

    // Proteção contra execuções excessivas
    if (execution.executionCount > 5) {
      console.error(`[useDeepLink] Too many executions (${execution.executionCount}), blocking to prevent infinite loop`);
      setError({
        type: 'infinite_loop',
        message: 'Muitas tentativas de carregamento. Recarregue a página.'
      });
      return;
    }

    execution.isExecuting = true;
    execution.lastEntityId = entityId;
    execution.lastEntityType = entityType;

    const loadEntityWithContext = async () => {
      try {
        setLoading(true);
        setError(null);

        let entityData;
        let contextData = {};

        switch (entityType) {
          case 'client':
            entityData = await loadClientWithContext(entityId, prefetchRelations);
            break;
          case 'service':
            const serviceResult = await loadServiceWithContext(entityId, prefetchRelations);
            entityData = serviceResult.entity;
            contextData = serviceResult.context;
            break;
          case 'project':
            const projectResult = await loadProjectWithContext(entityId, prefetchRelations);
            entityData = projectResult.entity;
            contextData = projectResult.context;
            break;
          default:
            throw new Error(`Unsupported entity type: ${entityType}`);
        }

        // Validar permissões se necessário
        if (validatePermissions) {
          const hasPermission = await validateEntityAccess(entityType, entityData, user);
          if (!hasPermission.allowed) {
            throw new Error(hasPermission.reason || 'Access denied');
          }
        }

        setData(entityData);
        setContext(contextData);
        stableOnSuccess(entityData, contextData);

      } catch (err) {
        console.error(`Error loading ${entityType} with context:`, err);
        
        // Tratamento especial para rate limiting
        if (err.message?.includes('429') || err.message?.includes('Rate limit')) {
          const retryError = {
            type: 'rate_limit',
            message: 'Muitas requisições. A página será recarregada em alguns segundos.',
            originalError: err,
            retryAfter: 3000
          };
          setError(retryError);
          
          // Auto-retry após delay
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          setError({
            type: getErrorType(err),
            message: err.message,
            originalError: err
          });
        }
        
        stableOnError(err);
      } finally {
        setLoading(false);
        execution.isExecuting = false;
      }
    };

    loadEntityWithContext();

    // Cleanup para resetar execução se o componente for desmontado
    return () => {
      execution.isExecuting = false;
    };

  }, [entityType, entityId, user, agencyId, prefetchRelations, validatePermissions, data, stableOnError, stableOnSuccess]);

  return {
    loading,
    error,
    data,
    context,
    retry: () => {
      // Resetar controles antes de retry
      executionRef.current = {
        isExecuting: false,
        lastEntityId: null,
        lastEntityType: null,
        executionCount: 0
      };
      window.location.reload();
    }
  };
}

async function loadClientWithContext(clientId, prefetch = true) {
  // Usar cache para cliente
  const client = await cachedApiCall('Client', 'get', clientId, {}, {
    ttl: 2 * 60 * 1000, // 2 minutos
    maxRetries: 2
  });
  
  if (!client) {
    throw new Error('Client not found');
  }

  if (prefetch) {
    try {
      // Carregar relações com cache e throttling - CORRIGIDO: incluir clientId na query
      const servicesParams = { 
        query: { clientId: clientId }, // CORRIGIDO: clientId específico
        sort: '-updated_date', 
        limit: 3 
      };
      
      const projectsParams = { 
        query: { clientId: clientId }, // CORRIGIDO: clientId específico
        sort: '-updated_date', 
        limit: 3 
      };

      const [services, projects] = await Promise.all([
        cachedApiCall('Service', 'filter', '', servicesParams, {
          ttl: 60 * 1000, // 1 minuto para listas
          maxRetries: 1
        }),
        cachedApiCall('Project', 'filter', '', projectsParams, {
          ttl: 60 * 1000,
          maxRetries: 1
        })
      ]);

      return {
        ...client,
        _prefetched: {
          services: services || [],
          projects: projects || []
        }
      };
    } catch (error) {
      console.warn('Failed to load client relations, returning basic client data:', error);
      // Retornar apenas o cliente básico se houver erro nas relações
      return client;
    }
  }

  return client;
}

async function loadServiceWithContext(serviceId, prefetch = true) {
  const service = await cachedApiCall('Service', 'get', serviceId, {}, {
    ttl: 2 * 60 * 1000,
    maxRetries: 2
  });
  
  if (!service) {
    throw new Error('Service not found');
  }

  let context = {};
  
  if (prefetch && service.clientId) {
    try {
      const client = await cachedApiCall('Client', 'get', service.clientId, {}, {
        ttl: 2 * 60 * 1000,
        maxRetries: 1
      });
      context.client = client;
    } catch (error) {
      console.warn('Failed to load service client:', error);
    }
  }

  return {
    entity: service,
    context
  };
}

async function loadProjectWithContext(projectId, prefetch = true) {
  const project = await cachedApiCall('Project', 'get', projectId, {}, {
    ttl: 2 * 60 * 1000,
    maxRetries: 2
  });
  
  if (!project) {
    throw new Error('Project not found');
  }

  let context = {};
  
  if (prefetch) {
    try {
      const promises = [];
      
      if (project.clientId) {
        promises.push(cachedApiCall('Client', 'get', project.clientId, {}, {
          ttl: 2 * 60 * 1000,
          maxRetries: 1
        }));
      }
      
      if (project.serviceId) {
        promises.push(cachedApiCall('Service', 'get', project.serviceId, {}, {
          ttl: 2 * 60 * 1000,
          maxRetries: 1
        }));
      }

      const [client, service] = await Promise.all(promises);
      
      if (client) context.client = client;
      if (service) context.service = service;
    } catch (error) {
      console.warn('Failed to load project relations:', error);
    }
  }

  return {
    entity: project,
    context
  };
}

async function validateEntityAccess(entityType, entity, user) {
  if (!entity || !user) {
    return { allowed: false, reason: 'Invalid entity or user' };
  }

  // Verificar se a entidade pertence à agência do usuário
  if (entity.agencyId && entity.agencyId !== (user.data?.agencyId || user.agencyId)) {
    return { allowed: false, reason: 'Entity belongs to different agency' };
  }

  // Verificações específicas por tipo de entidade
  switch (entityType) {
    case 'client':
      // Clientes só podem ver seus próprios dados
      if (user.role === 'client' && entity.id !== (user.data?.clientId || user.clientId)) {
        return { allowed: false, reason: 'Client can only access own data' };
      }
      break;
    
    case 'service':
      // Clientes só podem ver serviços onde são o cliente
      if (user.role === 'client' && entity.clientId !== (user.data?.clientId || user.clientId)) {
        return { allowed: false, reason: 'Client can only access own services' };
      }
      break;
    case 'project':
      // Clientes só podem ver projetos onde são o cliente
      if (user.role === 'client' && entity.clientId !== (user.data?.clientId || user.clientId)) {
        return { allowed: false, reason: 'Client can only access own projects' };
      }
      break;
  }

  return { allowed: true };
}

function getErrorType(error) {
  if (error.message.includes('not found') || error.message.includes('No record found')) {
    return '404';
  }
  if (error.message.includes('Access denied') || error.message.includes('access own')) {
    return '403';
  }
  if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('Rate limit')) {
    return 'rate_limit';
  }
  return 'general';
}

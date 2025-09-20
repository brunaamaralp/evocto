import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';

const ClientContext = createContext(null);

/**
 * Provider para contexto de cliente dedicado
 */
export function ClientContextProvider({ children }) {
  const [currentClient, setCurrentClient] = useState(null);
  const [clientServices, setClientServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para definir cliente por ID
  const setClientById = useCallback(async (clientId) => {
    if (!clientId) {
      setCurrentClient(null);
      setClientServices([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`[ClientContext] Loading client: ${clientId}`);
      
      // Carregar cliente e seus serviços
      const [client, services] = await Promise.all([
        Client.get(clientId),
        Service.filter({ clientId, is_active: true })
      ]);

      setCurrentClient(client);
      setClientServices(services);
      
      console.log(`[ClientContext] Client loaded:`, client.name);
    } catch (err) {
      console.error('[ClientContext] Error loading client:', err);
      setError(err.message);
      setCurrentClient(null);
      setClientServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para limpar contexto
  const clearClient = useCallback(() => {
    setCurrentClient(null);
    setClientServices([]);
    setError(null);
  }, []);

  // Função para recarregar dados do cliente atual
  const refreshClient = useCallback(async () => {
    if (currentClient?.id) {
      await setClientById(currentClient.id);
    }
  }, [currentClient?.id, setClientById]);

  const value = {
    // Estado
    currentClient,
    clientServices,
    loading,
    error,
    
    // Getters convenientes
    clientId: currentClient?.id || null,
    clientName: currentClient?.name || '',
    
    // Ações
    setClientById,
    clearClient,
    refreshClient
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

/**
 * Hook para usar o contexto de cliente
 */
export function useClientContext() {
  const context = useContext(ClientContext);
  
  if (!context) {
    throw new Error('useClientContext must be used within ClientContextProvider');
  }
  
  return context;
}
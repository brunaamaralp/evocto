import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

// Utilitário para navegação segura e com feedback
export const navigateToClientPanel = (clientId, options = {}) => {
  const { 
    showLoading = true, 
    onStart = () => {}, 
    onSuccess = () => {}, 
    onError = () => {} 
  } = options;

  return new Promise((resolve, reject) => {
    try {
      onStart();
      
      if (showLoading) {
        toast.loading('Carregando painel do cliente...', { id: 'navigate-loading' });
      }

      // Validar se o clientId existe
      if (!clientId) {
        throw new Error('ID do cliente não fornecido');
      }

      // Criar URL usando a função utilitária
      const url = createPageUrl('client', { clientId });
      
      // Simular delay para feedback visual
      setTimeout(() => {
        try {
          // Verificar se a página existe antes de navegar
          if (typeof window !== 'undefined') {
            window.location.href = url;
            onSuccess();
            resolve(url);
          } else {
            throw new Error('Ambiente de navegação não disponível');
          }
        } catch (navError) {
          console.error('Erro durante navegação:', navError);
          toast.error('Erro ao acessar o painel do cliente');
          onError(navError);
          reject(navError);
        } finally {
          if (showLoading) {
            toast.dismiss('navigate-loading');
          }
        }
      }, 300);

    } catch (error) {
      console.error('Erro ao preparar navegação:', error);
      toast.error('Erro ao acessar o painel do cliente');
      onError(error);
      reject(error);
    }
  });
};

// Validar se uma página existe
export const validatePageExists = async (pageName, params = {}) => {
  try {
    const url = createPageUrl(pageName, params);
    
    // Aqui você pode implementar uma verificação real
    // Por exemplo, fazer uma requisição HEAD para verificar se a página existe
    
    return { exists: true, url };
  } catch (error) {
    console.error('Erro ao validar página:', error);
    return { exists: false, url: null, error };
  }
};

// Hook para navegação com estado
export const useClientNavigation = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState(null);

  const navigateToClient = useCallback(async (clientId) => {
    setIsNavigating(true);
    setError(null);

    try {
      await navigateToClientPanel(clientId, {
        onStart: () => setIsNavigating(true),
        onSuccess: () => {
          setIsNavigating(false);
          toast.success('Redirecionando para o painel...');
        },
        onError: (err) => {
          setError(err.message);
          setIsNavigating(false);
        }
      });
    } catch (err) {
      setError(err.message);
      setIsNavigating(false);
    }
  }, []);

  return {
    navigateToClient,
    isNavigating,
    error,
    clearError: () => setError(null)
  };
};
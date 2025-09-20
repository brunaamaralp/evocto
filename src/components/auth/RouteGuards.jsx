import React, { useEffect, useState } from 'react';
import { useSession } from './SessionManager';
import { authEvents } from './authUtils';

// Guard para páginas que requerem autenticação
export function AuthGuard({ children, fallback = null }) {
  const { isAuthenticated, loading, sessionStatus } = useSession();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const handleAuthReady = () => {
      setAuthReady(true);
    };

    const handleAuthError = () => {
      setAuthReady(true);
    };

    authEvents.on('auth:ready', handleAuthReady);
    authEvents.on('auth:error', handleAuthError);

    return () => {
      authEvents.off('auth:ready', handleAuthReady);
      authEvents.off('auth:error', handleAuthError);
    };
  }, []);

  // Aguardar bootstrap completar
  if (!authReady || loading || sessionStatus === 'bootstrapping') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirecionar se não autenticado
  if (!isAuthenticated) {
    if (fallback) {
      return fallback;
    }

    // Redirecionar para login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acesso Restrito
          </h2>
          <p className="text-gray-600 mb-4">
            Você precisa estar logado para acessar esta página.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// Guard para páginas públicas (não bloqueia render)
export function PublicPageGuard({ children }) {
  const { loading } = useSession();

  // Para páginas públicas, nunca bloquear o render
  // Apenas mostrar loading state mínimo se necessário
  if (loading) {
    return (
      <div className="animate-fade-in">
        {children}
      </div>
    );
  }

  return children;
}

// Guard para redirecionamento condicional
export function ConditionalRedirect({ 
  condition, 
  to = '/', 
  children, 
  fallback = null 
}) {
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (condition) {
      setShouldRedirect(true);
      if (typeof window !== 'undefined') {
        window.location.href = to;
      }
    }
  }, [condition, to]);

  if (shouldRedirect) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return children;
}
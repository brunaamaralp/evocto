
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User } from '@/api/entities';
import { withDefault, safeGet } from '@/components/utils/safeGuards';

// Constantes de status da sessão
export const SESSION_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
  BOOTSTRAPPING: 'bootstrapping'
};

const SessionContext = createContext(null);

// VERSÃO CORRIGIDA - Melhor tratamento de 401s
export function SessionManager({ children, isPublicPage = false }) {
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(!isPublicPage);
  const [error, setError] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(
    isPublicPage ? SESSION_STATUS.UNAUTHENTICATED : SESSION_STATUS.BOOTSTRAPPING
  );

  const mountedRef = useRef(true);
  const initializationAttempted = useRef(false);

  // CORREÇÃO: Função para limpar estado de auth
  const clearAuthState = useCallback(() => {
    if (!mountedRef.current) return;

    setUser(null);
    setAgency(null);
    setError(null);
    setSessionStatus(SESSION_STATUS.UNAUTHENTICATED);
    setLoading(false);
  }, []);

  // CORREÇÃO: hasFeature com fallbacks seguros
  const hasFeature = useCallback((featureName) => {
    if (!user || !featureName) return false;

    try {
      // Verificar se a organização tem configuração específica
      const agencyFeatures = agency?.feature_flags || {};
      if (agencyFeatures.hasOwnProperty(featureName)) {
        return agencyFeatures[featureName];
      }

      // Fallback para configuração padrão por role
      const userRole = user.role || 'client';
      const roleFeatures = {
        owner: { advanced_analytics: true, content_helper: true, beta_features: true, multi_language: true },
        admin: { advanced_analytics: true, content_helper: true, beta_features: false, multi_language: true },
        team: { advanced_analytics: false, content_helper: true, beta_features: false, multi_language: true },
        client: { advanced_analytics: false, content_helper: false, beta_features: false, multi_language: false }
      };

      const defaultFeatures = roleFeatures[userRole] || roleFeatures.client;
      return defaultFeatures[featureName] || false;
    } catch (featureError) {
      console.warn('[SessionManager] Feature check error:', featureError);
      return false;
    }
  }, [user, agency]);

  // CORREÇÃO: Melhor tratamento de falha de autenticação
  const handleAuthFailure = useCallback(async (error) => {
    if (!mountedRef.current) return;

    console.log('[SessionManager] Auth failure details:', {
      message: error.message,
      status: error.response?.status,
      isPublicPage
    });

    // CORREÇÃO PRINCIPAL: Em páginas públicas, não tratar 401 como erro
    if (isPublicPage) {
      console.log('[SessionManager] 401 em página pública - comportamento normal');
      clearAuthState();
      return;
    }

    // Verificar se é erro 401 (não autorizado)
    const is401 = error.response?.status === 401 ||
                  error.status === 401 ||
                  error.message?.includes('401') ||
                  error.message?.includes('status code 401') ||
                  (error.code === 'ERR_BAD_REQUEST' && error.response?.status === 401);

    if (is401) {
      console.log('[SessionManager] 401 detectado em página protegida - limpando estado');
      clearAuthState();

      // Para páginas protegidas, redirecionar após um delay
      setTimeout(() => {
        if (mountedRef.current && typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 1000);
    } else {
      // Outros erros não relacionados a autenticação
      console.error('[SessionManager] Erro não-auth:', error);
      setError('Erro de conexão');
      setSessionStatus(SESSION_STATUS.ERROR);
      setLoading(false);
    }
  }, [isPublicPage, clearAuthState]);

  // CORREÇÃO: Bootstrap mais robusto - não tentar auth em páginas públicas
  const bootstrapAuth = useCallback(async () => {
    if (initializationAttempted.current || !mountedRef.current) return;
    initializationAttempted.current = true;

    try {
      // CORREÇÃO PRINCIPAL: Para páginas públicas, não tentar autenticar
      if (isPublicPage) {
        console.log('[SessionManager] Página pública - pulando autenticação');
        clearAuthState();
        return;
      }

      setSessionStatus(SESSION_STATUS.BOOTSTRAPPING);
      setError(null);

      console.log('[SessionManager] Iniciando bootstrap de autenticação...');

      // Tentar obter usuário atual
      const userData = await User.me();

      if (!userData) {
        console.log('[SessionManager] Nenhum dado de usuário retornado');
        clearAuthState();
        return;
      }

      if (!mountedRef.current) return;

      console.log('[SessionManager] Usuário autenticado:', userData.email);
      setUser(userData);

      // Buscar organização se necessário
      const agencyId = userData.agencyId || userData.data?.agencyId || userData.agency_id;

      if (agencyId) {
        try {
          const { Agency } = await import('@/api/entities');
          const agencyData = await Agency.get(agencyId);

          if (agencyData && mountedRef.current) {
            setAgency(agencyData);
            console.log('[SessionManager] Organização carregada:', agencyData.agencyName);
          }
        } catch (agencyError) {
          console.warn('[SessionManager] Não foi possível carregar organização:', agencyError);
          // Não falhar se não conseguir carregar organização
        }
      }

      if (mountedRef.current) {
        setSessionStatus(SESSION_STATUS.AUTHENTICATED);
        setLoading(false);
      }

    } catch (bootstrapError) {
      console.log('[SessionManager] Erro no bootstrap - delegando para handleAuthFailure');
      await handleAuthFailure(bootstrapError);
    }
  }, [isPublicPage, handleAuthFailure, clearAuthState]);

  // CORREÇÃO: Login mais robusto
  const login = useCallback(async (credentials) => {
    try {
      console.log('[SessionManager] Iniciando login...');
      setError(null);
      setLoading(true);

      if (!credentials?.email || !credentials?.password) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }

      await User.login(credentials);
      console.log('[SessionManager] Login concluído.');

      initializationAttempted.current = false;
      await bootstrapAuth();

    } catch (loginError) {
      console.error('[SessionManager] Erro no login:', loginError);
      setError('Erro ao fazer login');
      setSessionStatus(SESSION_STATUS.ERROR);
      setLoading(false);
      throw loginError;
    }
  }, [bootstrapAuth]);

  // CORREÇÃO: Logout mais limpo
  const logout = useCallback(async () => {
    try {
      console.log('[SessionManager] Iniciando logout...');
      await User.logout();
    } catch (error) {
      console.warn('[SessionManager] Erro no logout (ignorando):', error.message);
    } finally {
      console.log('[SessionManager] Logout concluído - limpando estado');
      clearAuthState();

      if (!isPublicPage && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, [isPublicPage, clearAuthState]);

  // CORREÇÃO: UpdateUser com melhor tratamento de erro
  const updateUser = useCallback(async (data) => {
    try {
      if (!data) throw new Error('Nenhum dado fornecido para atualização do usuário');

      console.log('[SessionManager] Atualizando dados do usuário...');
      await User.updateMyUserData(data);
      const updatedUserData = await User.me();

      if (updatedUserData && mountedRef.current) {
        setUser(updatedUserData);
        console.log('[SessionManager] Dados do usuário atualizados');
      }
    } catch (updateError) {
      console.error('[SessionManager] Erro ao atualizar usuário:', updateError);

      // Se for 401, tratar como falha de auth
      if (updateError.response?.status === 401 || updateError.message?.includes('401')) {
        await handleAuthFailure(updateError);
      } else {
        setError('Erro ao atualizar usuário');
      }
      throw updateError;
    }
  }, [handleAuthFailure]);

  // Inicialização - CORREÇÃO: só executar se não for página pública
  useEffect(() => {
    if (!isPublicPage && !initializationAttempted.current) {
      bootstrapAuth();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [isPublicPage, bootstrapAuth]);

  // Context value memoizado
  const contextValue = useMemo(() => ({
    user: user || null,
    agency: agency || null,
    loading: loading || false,
    error: error || null,
    sessionStatus: sessionStatus || SESSION_STATUS.LOADING,
    isAuthenticated: Boolean(user?.id && sessionStatus === SESSION_STATUS.AUTHENTICATED),
    login,
    logout,
    updateUser,
    bootstrapAuth,

    // Feature checking
    hasFeature,

    // CORREÇÃO: Getters seguros para propriedades comuns com múltiplas tentativas
    userId: user?.id || null,
    userEmail: user?.email || '',
    userName: user?.full_name || 'Usuário',
    userRole: user?.role || 'client',
    // CHAVE: Múltiplas tentativas para encontrar agencyId
    agencyId: user?.agencyId || user?.data?.agencyId || user?.agency_id || agency?.id || null,
    agencyName: agency?.agencyName || 'Organização',

    // Verificadores de permissão seguros
    isOwner: () => user?.role === 'owner',
    isAdmin: () => ['owner', 'admin'].includes(user?.role || ''),
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles = []) => roles.includes(user?.role || '')
  }), [
    user, agency, loading, error, sessionStatus,
    login, logout, updateUser, bootstrapAuth, hasFeature
  ]);

  // CORREÇÃO: Não mostrar tela de erro para páginas públicas
  if (isPublicPage) {
    return (
      <SessionContext.Provider value={contextValue}>
        {children}
      </SessionContext.Provider>
    );
  }

  // Para páginas protegidas - tela de erro mais informativa apenas quando necessário
  if (sessionStatus === SESSION_STATUS.ERROR || (error && !loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6 bg-white rounded-2xl shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Redirecionando...</h2>
          <p className="text-gray-600 mb-4">Sua sessão expirou. Redirecionando para o login...</p>
          <button
            onClick={() => {
              clearAuthState();
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
          >
            Fazer Login Agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

// Renomeamos para manter compatibilidade
export const SessionProvider = SessionManager;

// Hook com verificação de contexto
export function useSession() {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context || {
    user: null,
    agency: null,
    loading: false,
    error: null,
    sessionStatus: SESSION_STATUS.UNAUTHENTICATED,
    isAuthenticated: false,
    login: () => Promise.reject(new Error('SessionProvider not available')),
    logout: () => Promise.reject(new Error('SessionProvider not available')),
    updateUser: () => Promise.reject(new Error('SessionProvider not available')),
    bootstrapAuth: () => Promise.reject(new Error('SessionProvider not available')),
    hasFeature: () => false,
    userId: null,
    userEmail: '',
    userName: 'Usuário',
    userRole: 'client',
    agencyId: null,
    agencyName: 'Organização',
    isOwner: () => false,
    isAdmin: () => false,
    hasRole: () => false,
    hasAnyRole: () => false
  };
}

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User } from '@/api/entities';

export const SESSION_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
  BOOTSTRAPPING: 'bootstrapping',
};

const SessionContext = createContext(null);

export function SessionManager({ children, isPublicPage = false }) {
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(!isPublicPage);
  const [error, setError] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(
    isPublicPage ? SESSION_STATUS.UNAUTHENTICATED : SESSION_STATUS.BOOTSTRAPPING
  );

  const mountedRef = useRef(true);
  const inFlightRef = useRef(null);
  const userRef = useRef(null);
  const isPublicRef = useRef(isPublicPage);
  isPublicRef.current = isPublicPage;

  const clearAuthState = useCallback(() => {
    if (!mountedRef.current) return;
    setUser(null);
    userRef.current = null;
    setAgency(null);
    setError(null);
    setSessionStatus(SESSION_STATUS.UNAUTHENTICATED);
    setLoading(false);
  }, []);

  const hasFeature = useCallback((featureName) => {
    if (!user || !featureName) return false;
    try {
      const agencyFeatures = agency?.feature_flags || {};
      if (Object.hasOwn(agencyFeatures, featureName)) {
        return agencyFeatures[featureName];
      }
      const userRole = user.role || 'client';
      const roleFeatures = {
        owner: { advanced_analytics: true, content_helper: true, beta_features: true, multi_language: true },
        admin: { advanced_analytics: true, content_helper: true, beta_features: false, multi_language: true },
        team: { advanced_analytics: false, content_helper: true, beta_features: false, multi_language: true },
        client: { advanced_analytics: false, content_helper: false, beta_features: false, multi_language: false },
      };
      return Boolean((roleFeatures[userRole] || roleFeatures.client)[featureName]);
    } catch {
      return false;
    }
  }, [user, agency]);

  const handleAuthFailure = useCallback(async (authError) => {
    if (!mountedRef.current) return;

    if (isPublicRef.current) {
      clearAuthState();
      return;
    }

    const is401 =
      authError?.response?.status === 401 ||
      authError?.status === 401 ||
      authError?.message?.includes('401') ||
      authError?.message?.includes('status code 401');

    if (is401) {
      clearAuthState();
      setTimeout(() => {
        if (mountedRef.current && typeof window !== 'undefined') {
          window.location.replace('/login');
        }
      }, 200);
      return;
    }

    setError('Erro de conexão');
    setSessionStatus(SESSION_STATUS.ERROR);
    setLoading(false);
  }, [clearAuthState]);

  const loadAgencyInBackground = useCallback(async (agencyId) => {
    if (!agencyId) return;
    try {
      const { Agency } = await import('@/api/entities');
      const agencyData = await Agency.get(agencyId);
      if (agencyData && mountedRef.current) {
        setAgency(agencyData);
      }
    } catch (agencyError) {
      console.warn('[SessionManager] Não foi possível carregar organização:', agencyError);
    }
  }, []);

  const bootstrapAuth = useCallback(async ({ force = false } = {}) => {
    if (!mountedRef.current) return null;
    if (!force && userRef.current?.id) {
      return userRef.current;
    }
    if (inFlightRef.current) return inFlightRef.current;

    inFlightRef.current = (async () => {
      try {
        if (!isPublicRef.current) {
          setSessionStatus(SESSION_STATUS.BOOTSTRAPPING);
          setLoading(true);
        }
        setError(null);

        const userData = await User.me();
        if (!mountedRef.current) return null;

        if (!userData?.id) {
          clearAuthState();
          return null;
        }

        setUser(userData);
        userRef.current = userData;
        setSessionStatus(SESSION_STATUS.AUTHENTICATED);
        setLoading(false);

        const agencyId = userData.agencyId || userData.data?.agencyId || userData.agency_id;
        void loadAgencyInBackground(agencyId);
        return userData;
      } catch (bootstrapError) {
        await handleAuthFailure(bootstrapError);
        return null;
      } finally {
        inFlightRef.current = null;
      }
    })();

    return inFlightRef.current;
  }, [clearAuthState, handleAuthFailure, loadAgencyInBackground]);

  const login = useCallback(async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      if (!credentials?.email || !credentials?.password) {
        if (typeof window !== 'undefined') window.location.href = '/login';
        return;
      }
      await User.login(credentials);
      return await bootstrapAuth({ force: true });
    } catch (loginError) {
      setError('Erro ao fazer login');
      setSessionStatus(SESSION_STATUS.ERROR);
      setLoading(false);
      throw loginError;
    }
  }, [bootstrapAuth]);

  const logout = useCallback(async () => {
    try {
      await User.logout();
    } catch (logoutError) {
      console.warn('[SessionManager] Erro no logout (ignorando):', logoutError?.message);
    } finally {
      clearAuthState();
      if (!isPublicRef.current && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, [clearAuthState]);

  const updateUser = useCallback(async (data) => {
    if (!data) throw new Error('Nenhum dado fornecido para atualização do usuário');
    await User.updateMyUserData(data);
    const updatedUserData = await User.me();
    if (updatedUserData && mountedRef.current) {
      setUser(updatedUserData);
    }
    return updatedUserData;
  }, []);

  // Sempre aquece a sessão (também em páginas públicas), sem bloquear a UI pública.
  useEffect(() => {
    mountedRef.current = true;
    void bootstrapAuth();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montagem única; inFlight deduplica
  }, []);

  // Ao entrar em rota protegida, garante loading até a sessão aquecida estar pronta.
  useEffect(() => {
    if (isPublicPage) return;

    if (user?.id && sessionStatus === SESSION_STATUS.AUTHENTICATED) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSessionStatus((prev) =>
      prev === SESSION_STATUS.AUTHENTICATED ? prev : SESSION_STATUS.BOOTSTRAPPING
    );
    void bootstrapAuth();
    // Só reage à troca de rota pública→protegida; bootstrapAuth/user mudam durante o fluxo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicPage]);

  // Quando o warm da landing termina e já estamos em rota protegida, libera o loading.
  useEffect(() => {
    if (isPublicPage) return;
    if (user?.id && sessionStatus === SESSION_STATUS.AUTHENTICATED) {
      setLoading(false);
    }
  }, [isPublicPage, user?.id, sessionStatus]);

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
    hasFeature,
    userId: user?.id || null,
    userEmail: user?.email || '',
    userName: user?.full_name || user?.name || 'Usuário',
    userRole: user?.role || 'client',
    agencyId: user?.agencyId || user?.data?.agencyId || user?.agency_id || agency?.id || null,
    agencyName: agency?.agencyName || 'Organização',
    isOwner: () => user?.role === 'owner',
    isAdmin: () => ['owner', 'admin'].includes(user?.role || ''),
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles = []) => roles.includes(user?.role || ''),
  }), [
    user, agency, loading, error, sessionStatus,
    login, logout, updateUser, bootstrapAuth, hasFeature,
  ]);

  if (isPublicPage) {
    return (
      <SessionContext.Provider value={contextValue}>
        {children}
      </SessionContext.Provider>
    );
  }

  if (sessionStatus === SESSION_STATUS.ERROR || (error && !loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6 bg-white rounded-2xl shadow-lg text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Redirecionando...</h2>
          <p className="text-gray-600 mb-4">Sua sessão expirou. Redirecionando para o login...</p>
          <button
            type="button"
            onClick={() => {
              clearAuthState();
              if (typeof window !== 'undefined') window.location.replace('/login');
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

export const SessionProvider = SessionManager;

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
    hasAnyRole: () => false,
  };
}

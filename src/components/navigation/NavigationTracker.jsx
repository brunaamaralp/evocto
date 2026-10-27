import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveContextualBackUrl } from '@/lib/shellNavigation';

const NavigationContext = createContext();

function locationKey(location) {
  return `${location.pathname}${location.search || ''}`;
}

export const NavigationProvider = ({ children }) => {
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [currentContext, setCurrentContext] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const key = locationKey(location);
    setNavigationHistory((prev) => {
      if (prev[prev.length - 1] === key) return prev;
      return [...prev, key].slice(-10);
    });

    const urlParams = new URLSearchParams(location.search);
    setCurrentContext({
      clientId: urlParams.get('clientId'),
      serviceId: urlParams.get('serviceId'),
      pathname: location.pathname,
      search: location.search,
    });
  }, [location]);

  const canGoBack = navigationHistory.length > 1;

  const getContextualBackUrl = useCallback(() => {
    return resolveContextualBackUrl({
      pathname: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);

  const fallbackUrl = useMemo(
    () =>
      resolveContextualBackUrl({
        pathname: location.pathname,
        search: location.search,
      }),
    [location.pathname, location.search]
  );

  /** true quando o botão deve ficar clicável */
  const canNavigateBack = canGoBack || Boolean(fallbackUrl);

  const goBack = useCallback(() => {
    if (canGoBack) {
      navigate(-1);
      return;
    }
    if (fallbackUrl) {
      navigate(fallbackUrl);
    }
  }, [canGoBack, fallbackUrl, navigate]);

  const value = useMemo(
    () => ({
      navigationHistory,
      currentContext,
      canGoBack,
      canNavigateBack,
      goBack,
      getContextualBackUrl,
      fallbackUrl,
    }),
    [
      navigationHistory,
      currentContext,
      canGoBack,
      canNavigateBack,
      goBack,
      getContextualBackUrl,
      fallbackUrl,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

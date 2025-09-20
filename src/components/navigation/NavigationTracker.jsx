import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [currentContext, setCurrentContext] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Adicionar ao histórico
    setNavigationHistory(prev => {
      const newHistory = [...prev, location.pathname];
      // Manter apenas os últimos 10 itens
      return newHistory.slice(-10);
    });

    // Detectar contexto atual baseado na URL
    const urlParams = new URLSearchParams(location.search);
    const clientId = urlParams.get('clientId');
    const serviceId = urlParams.get('serviceId');
    
    setCurrentContext({
      clientId,
      serviceId,
      pathname: location.pathname
    });
  }, [location]);

  const goBack = () => {
    if (navigationHistory.length > 1) {
      window.history.back();
    }
  };

  const getContextualBackUrl = () => {
    const urlParams = new URLSearchParams(location.search);
    const clientId = urlParams.get('clientId');
    const serviceId = urlParams.get('serviceId');

    // Lógica para determinar para onde voltar baseado no contexto
    if (location.pathname.includes('/client') && clientId) {
      return '/clients';
    }
    if (location.pathname.includes('/service') && serviceId) {
      return '/services-overview';
    }
    
    return '/dashboard';
  };

  return (
    <NavigationContext.Provider value={{
      navigationHistory,
      currentContext,
      goBack,
      getContextualBackUrl
    }}>
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
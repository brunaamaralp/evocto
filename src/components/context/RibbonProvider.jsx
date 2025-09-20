import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { withDefault } from '@/components/utils/safeGuards';

const RibbonContext = createContext(null);

// Compatibilidade global para código legado
let ribbonCompatRef = { current: null };

// Verificar se está em desenvolvimento (sem usar process)
const isDevelopment = () => {
  try {
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname.includes('127.0.0.1') ||
            window.location.hostname.includes('.local'));
  } catch {
    return false;
  }
};

// Função de compatibilidade para código antigo
export function clearRibbonContext() {
  if (isDevelopment()) {
    console.warn('clearRibbonContext() is deprecated. Use useRibbon().clear() instead.');
  }
  
  if (ribbonCompatRef.current && typeof ribbonCompatRef.current.clear === 'function') {
    ribbonCompatRef.current.clear();
  }
}

export function RibbonProvider({ children }) {
  const [ribbonContent, setRibbonContent] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [type, setType] = useState('info'); // 'info', 'warning', 'error', 'success'

  // Usar useCallback para estabilizar as funções
  const show = useCallback((content, ribbonType = 'info') => {
    setRibbonContent(content);
    setType(ribbonType);
    setIsVisible(true);
  }, []);
  
  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);
  
  const clear = useCallback(() => {
    setRibbonContent(null);
    setIsVisible(false);
    setType('info');
  }, []);

  const showInfo = useCallback((content) => show(content, 'info'), [show]);
  const showWarning = useCallback((content) => show(content, 'warning'), [show]);
  const showError = useCallback((content) => show(content, 'error'), [show]);
  const showSuccess = useCallback((content) => show(content, 'success'), [show]);

  // Usar useMemo para estabilizar o contextValue
  const contextValue = useMemo(() => ({
    // Estado atual
    content: withDefault(ribbonContent, null),
    isVisible: withDefault(isVisible, false),
    type: withDefault(type, 'info'),
    
    // Ações
    show,
    hide,
    clear,
    
    // Métodos de conveniência
    showInfo,
    showWarning,
    showError,
    showSuccess
  }), [ribbonContent, isVisible, type, show, hide, clear, showInfo, showWarning, showError, showSuccess]);

  // Configurar referência para compatibilidade
  useEffect(() => {
    ribbonCompatRef.current = contextValue;
    return () => {
      ribbonCompatRef.current = null;
    };
  }, [contextValue]);

  return (
    <RibbonContext.Provider value={contextValue}>
      {children}
      {/* Renderizar o Ribbon se visível */}
      {isVisible && ribbonContent && (
        <RibbonBanner 
          content={ribbonContent} 
          type={type} 
          onClose={hide} 
        />
      )}
    </RibbonContext.Provider>
  );
}

// Componente do banner do Ribbon
function RibbonBanner({ content, type, onClose }) {
  const typeStyles = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200'
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 border-b ${typeStyles[type]} px-4 py-2`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex-1 text-sm">
          {typeof content === 'string' ? content : content}
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-current hover:opacity-70 transition-opacity"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Hook para usar o contexto do Ribbon
export function useRibbon() {
  const context = useContext(RibbonContext);
  
  if (context === undefined) {
    throw new Error('useRibbon must be used within a RibbonProvider');
  }
  
  return withDefault(context, {
    content: null,
    isVisible: false,
    type: 'info',
    show: () => {},
    hide: () => {},
    clear: () => {},
    showInfo: () => {},
    showWarning: () => {},
    showError: () => {},
    showSuccess: () => {}
  });
}

// Hook com verificação segura para código de transição
export function useSafeRibbon() {
  try {
    return useRibbon();
  } catch (error) {
    // Retornar API no-op se provider não estiver disponível
    return {
      content: null,
      isVisible: false,
      type: 'info',
      show: () => {},
      hide: () => {},
      clear: () => {},
      showInfo: () => {},
      showWarning: () => {},
      showError: () => {},
      showSuccess: () => {}
    };
  }
}

export default RibbonProvider;
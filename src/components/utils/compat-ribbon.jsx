// Camada de compatibilidade para código legado
import { useSafeRibbon } from '@/components/context/RibbonProvider';

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

// Função global de compatibilidade
export function clearRibbonContext() {
  if (isDevelopment()) {
    console.warn('[DEPRECATED] clearRibbonContext() is deprecated. Use useRibbon().clear() instead.');
  }
  
  try {
    // Tentar acessar a instância global se disponível
    if (window.__ribbonInstance && typeof window.__ribbonInstance.clear === 'function') {
      window.__ribbonInstance.clear();
      return;
    }
  } catch (error) {
    // Ignorar erros silenciosamente
  }
}

// Hook de compatibilidade que sempre funciona
export function useCompatRibbon() {
  const ribbon = useSafeRibbon();
  
  // Expor instância globalmente para compatibilidade
  if (typeof window !== 'undefined') {
    window.__ribbonInstance = ribbon;
  }
  
  return ribbon;
}

// Versões seguras das funções antigas
export function safeCall(fn, ...args) {
  if (typeof fn === 'function') {
    try {
      return fn(...args);
    } catch (error) {
      console.warn('Safe call failed:', error);
      return null;
    }
  }
  return null;
}

// Função de limpeza segura para usar em componentes
export function safeClearRibbon() {
  try {
    if (typeof clearRibbonContext === 'function') {
      clearRibbonContext();
    }
  } catch (error) {
    // Ignorar erro silenciosamente
  }
}
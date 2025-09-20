import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { withDefault, safeGet } from '@/components/utils/safeGuards';

// Import translations with safe fallback
import enTranslations from './locales-en';
import ptTranslations from './locales-pt';

const I18nContext = createContext(null);

// Translations com verificação de segurança
const translations = {
  en: withDefault(enTranslations, {}),
  pt: withDefault(ptTranslations, {})
};

// Main I18nProvider component
export function I18nProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState('pt'); // Default to Portuguese
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  // Callback para inicialização de idioma (evita warning de dependência)
  const initializeLanguage = useCallback(async () => {
    try {
      let language = 'pt'; // Start with Portuguese as the firm default.
      
      // ONLY override if a language has been previously saved by the user in localStorage.
      try {
        const savedLanguage = localStorage.getItem('evocto_language');
        if (savedLanguage && translations[savedLanguage]) {
          language = savedLanguage;
        }
      } catch (storageError) {
        console.warn('Failed to read language from localStorage:', storageError);
      }
      
      setCurrentLanguage(language);
      
    } catch (error) {
      console.warn('Failed to initialize language, using Portuguese:', error);
      setCurrentLanguage('pt');
      setErrors(prev => [...prev, error.message]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  const changeLanguage = useCallback(async (newLanguage) => {
    if (!newLanguage || !translations[newLanguage]) {
      console.warn(`Language ${newLanguage} not supported`);
      return false;
    }

    try {
      setCurrentLanguage(newLanguage);
      
      // Salvar no localStorage com try/catch
      try {
        localStorage.setItem('evocto_language', newLanguage);
      } catch (storageError) {
        console.warn('Failed to save language preference:', storageError);
      }
      
      // Update URL parameter sem quebrar se falhar
      try {
        const url = new URL(window.location);
        url.searchParams.set('lang', newLanguage);
        window.history.replaceState({}, '', url);
      } catch (urlError) {
        console.warn('Failed to update URL:', urlError);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to change language:', error);
      return false;
    }
  }, []);

  // Função de tradução com múltiplos fallbacks
  const t = useCallback((key, defaultValue = '', interpolations = {}) => {
    if (loading) return withDefault(defaultValue, key);
    
    if (!key || typeof key !== 'string') {
      console.warn('Invalid translation key:', key);
      return withDefault(defaultValue, 'INVALID_KEY');
    }

    // Helper para buscar valor aninhado
    const getNestedValue = (obj, path) => {
      if (!obj || typeof obj !== 'object') return null;
      
      return path.split('.').reduce((current, pathKey) => {
        return current && typeof current === 'object' && pathKey in current 
          ? current[pathKey] 
          : null;
      }, obj);
    };

    // Tentar idioma atual
    let translation = getNestedValue(translations[currentLanguage], key);
    
    // Fallback para português se não encontrou
    if (translation == null) {
      translation = getNestedValue(translations.pt, key);
    }

    // Fallback para inglês como último recurso
    if (translation == null) {
      translation = getNestedValue(translations.en, key);
    }
    
    // Fallback final
    if (translation == null) {
      translation = withDefault(defaultValue, key);
    }

    // Handle interpolações (e.g., "Hello {{name}}")
    if (typeof translation === 'string' && interpolations && typeof interpolations === 'object') {
      return Object.keys(interpolations).reduce((text, placeholder) => {
        const value = interpolations[placeholder];
        return text.replace(new RegExp(`{{${placeholder}}}`, 'g'), withDefault(value, ''));
      }, translation);
    }

    return translation;
  }, [loading, currentLanguage]);

  const contextValue = useMemo(() => {
    const isRTL = false; // Add RTL logic here if needed for languages like Arabic/Hebrew
    const locale = currentLanguage === 'pt' ? 'pt-BR' : 'en-US';

    return {
      currentLanguage: withDefault(currentLanguage, 'pt'),
      changeLanguage,
      t,
      loading: withDefault(loading, false),
      errors: withDefault(errors, []),
      availableLanguages: Object.keys(translations),
      isRTL,
      
      // Utility methods seguros
      formatNumber: (num, options = {}) => {
        try {
          const safeNum = typeof num === 'number' ? num : parseFloat(num) || 0;
          return new Intl.NumberFormat(locale, options).format(safeNum);
        } catch (formatError) {
          console.warn('Number formatting failed:', formatError);
          return String(num || 0);
        }
      },
      
      formatDate: (date, options = {}) => {
        try {
          const safeDate = date instanceof Date ? date : new Date(date);
          if (isNaN(safeDate.getTime())) throw new Error('Invalid date');
          return new Intl.DateTimeFormat(locale, options).format(safeDate);
        } catch (formatError) {
          console.warn('Date formatting failed:', formatError);
          return String(date || 'Invalid Date');
        }
      },
      
      formatCurrency: (amount, currency = 'BRL') => {
        try {
          const currencyCode = currentLanguage === 'en' && currency === 'BRL' ? 'USD' : currency;
          const safeAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
          return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode
          }).format(safeAmount);
        } catch (formatError) {
          console.warn('Currency formatting failed:', formatError);
          return `${currency} ${amount || 0}`;
        }
      }
    }
  }, [currentLanguage, changeLanguage, t, loading, errors]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook para usar o contexto do Ribbon
export function useTranslation() {
  const context = useContext(I18nContext);
  
  if (context === undefined) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  
  return withDefault(context, {
    currentLanguage: 'pt',
    changeLanguage: () => Promise.resolve(false),
    t: (key, defaultValue = '') => withDefault(defaultValue, key),
    loading: false,
    errors: [],
    availableLanguages: ['pt'],
    isRTL: false,
    formatNumber: (num) => String(num || 0),
    formatDate: (date) => String(date || 'Invalid Date'),
    formatCurrency: (amount, currency = 'BRL') => `${currency} ${amount || 0}`
  });
}

// Convenience hook para só a função t
export function useT() {
  const { t } = useTranslation();
  return t;
}

export default I18nProvider;
import React from 'react';
import { ClientContextProvider } from '@/components/hooks/useClientContext';

/**
 * Provider central que agrega todos os contextos da aplicação
 */
export function AppContextProvider({ children }) {
  return (
    <ClientContextProvider>
      {children}
    </ClientContextProvider>
  );
}
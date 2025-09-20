import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { RibbonProvider } from '@/components/context/RibbonProvider';
import ContextualLayout from './ContextualLayout';

/**
 * Layout principal USANDO ContextualLayout
 */
export function AuthenticatedLayout({ children }) {
  const { user, isAuthenticated, loading } = useSession();

  // Se ainda está carregando, mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Carregando...</span>
        </div>
      </div>
    );
  }

  // Se não está autenticado, o SessionManager já vai redirecionar
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <RibbonProvider>
      {/* USAR ContextualLayout em vez do layout fixo */}
      <ContextualLayout user={user}>
        {children}
      </ContextualLayout>

      {/* REMOVER NotificationCenter daqui - deve ficar apenas no header */}
    </RibbonProvider>
  );
}

/**
 * Layout para páginas públicas - SEM HEADER DUPLICADO
 */
export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* NÃO renderizar header aqui - deixar a página welcome controlar */}
      <main>
        {children}
      </main>
    </div>
  );
}
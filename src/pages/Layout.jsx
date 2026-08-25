
import React from "react";
import { SessionProvider } from '@/components/auth/SessionManager';
import I18nProvider from '@/components/i18n/I18nProvider';
import { AppContextProvider } from '@/components/context/AppContextProvider';
import { ReactiveStateProvider } from '@/components/state/ReactiveStateManager';
import { AuthenticatedLayout, PublicLayout } from '@/components/layout/AuthenticatedLayout';
import { NavigationProvider } from '@/components/navigation/NavigationTracker';
import TaskCreateFab from '@/components/tasks/TaskCreateFab';
import TaskDrawer from '@/components/tasks/TaskDrawer';
// UXMonitor temporariamente removido devido a rate limit issues
// import UXMonitor from '@/components/monitoring/UXMonitor';
import ServiceActionsFab from '@/components/services/ServiceActionsFab';

// Lista de rotas públicas que não precisam de sidebar
const publicRoutes = [
  '/',
  '/welcome',
  '/login',
  '/create-account',
  '/create-agency',
  '/client-login',
  '/password-reset',
  '/PasswordReset',
  '/terms-of-service',
  '/privacy-policy',
  '/public-approval',
  '/public-briefing'
];

function isPublicRoute(pathname) {
  return publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Componente interno para decidir layout
function LayoutContent({ children, isPublic }) {
  if (isPublic) {
    return <PublicLayout>{children}</PublicLayout>;
  }

  return (
    <ReactiveStateProvider>
      <AppContextProvider>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </AppContextProvider>
    </ReactiveStateProvider>
  );
}

// Componente Layout principal - VERSÃO LIMPA SEM MODAIS GLOBAIS
function Layout({ children }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublic = isPublicRoute(pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <I18nProvider>
        <SessionProvider isPublicPage={isPublic}>
          <NavigationProvider>
            <LayoutContent isPublic={isPublic}>
              {children}
            </LayoutContent>
            {/* Botão flutuante global para criar tarefas (não aparece em rotas públicas) */}
            {!isPublic && <TaskCreateFab />}
            {/* Drawer global de tarefa (abre por evento window.dispatchEvent(new CustomEvent('task:open',{detail:{taskId}}))) */}
            {!isPublic && <TaskDrawer />}
            {/* NOVO: Ações rápidas do serviço (ativa/inativa/exclui e gera tarefas) */}
            {!isPublic && <ServiceActionsFab />}
          </NavigationProvider>
          {/* UXMonitor temporariamente desabilitado devido a rate limit issues */}
          {/* {!isPublic && <UXMonitor />} */}
        </SessionProvider>
      </I18nProvider>
    </div>
  );
}

export default Layout;

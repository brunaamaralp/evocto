import { useSession } from '@/components/auth/SessionManager';
import { RibbonProvider } from '@/components/context/RibbonProvider';
import ContextualLayout from './ContextualLayout';
import { ClientLayout } from './ClientLayout';

/**
 * Layout principal: staff → ContextualLayout; cliente → ClientLayout.
 */
export function AuthenticatedLayout({ children }) {
  const { user, isAuthenticated, loading } = useSession();

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'client') {
    return <ClientLayout>{children}</ClientLayout>;
  }

  return (
    <RibbonProvider>
      <ContextualLayout user={user}>
        {children}
      </ContextualLayout>
    </RibbonProvider>
  );
}

/**
 * Layout para páginas públicas - SEM HEADER DUPLICADO
 */
export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        {children}
      </main>
    </div>
  );
}

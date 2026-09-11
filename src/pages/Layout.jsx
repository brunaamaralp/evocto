import { useLocation } from 'react-router-dom';
import { SessionProvider } from '@/components/auth/SessionManager';
import I18nProvider from '@/components/i18n/I18nProvider';
import { AppContextProvider } from '@/components/context/AppContextProvider';
import { ReactiveStateProvider } from '@/components/state/ReactiveStateManager';
import { AuthenticatedLayout, PublicLayout } from '@/components/layout/AuthenticatedLayout';
import { NavigationProvider } from '@/components/navigation/NavigationTracker';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import ServiceActionsFab from '@/components/services/ServiceActionsFab';

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
  '/public-briefing',
  '/public-deliverable-approval',
  '/review',
  '/campaigns',
];

function isPublicRoute(pathname) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

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

function Layout({ children }) {
  const { pathname } = useLocation();
  const isPublic = isPublicRoute(pathname);
  const isClientPortalSurface =
    pathname.toLowerCase().includes('client-portal') ||
    pathname.startsWith('/ClientArea') ||
    pathname.startsWith('/ClientDemo') ||
    pathname.startsWith('/cliente/');
  const hideServiceFab =
    isClientPortalSurface ||
    pathname.includes('/client-tasks') ||
    pathname.includes('/client-campaign');
  const hideTaskDrawer = isClientPortalSurface;

  return (
    <div className="min-h-screen bg-gray-50">
      <I18nProvider>
        <SessionProvider isPublicPage={isPublic}>
          <NavigationProvider>
            <LayoutContent isPublic={isPublic}>
              {children}
            </LayoutContent>
            {!isPublic && !hideTaskDrawer && <TaskDrawer />}
            {!isPublic && !hideServiceFab && <ServiceActionsFab />}
          </NavigationProvider>
        </SessionProvider>
      </I18nProvider>
    </div>
  );
}

export default Layout;

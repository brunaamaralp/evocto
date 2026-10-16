import { useLocation } from 'react-router-dom';
import { SessionProvider } from '@/components/auth/SessionManager';
import I18nProvider from '@/components/i18n/I18nProvider';
import { AppContextProvider } from '@/components/context/AppContextProvider';
import { ReactiveStateProvider } from '@/components/state/ReactiveStateManager';
import { AuthenticatedLayout, PublicLayout } from '@/components/layout/AuthenticatedLayout';
import { NavigationProvider } from '@/components/navigation/NavigationTracker';
import TaskDrawer from '@/components/tasks/TaskDrawer';

const publicRoutes = [
  '/',
  '/welcome',
  '/login',
  '/create-account',
  '/create-agency',
  '/onboarding',
  '/client-login',
  '/client-activation',
  '/client-set-password',
  '/invite-accept',
  '/password-reset',
  '/PasswordReset',
  '/NotFound',
  '/404',
  '/terms-of-service',
  '/privacy-policy',
  '/public-approval',
  '/public-briefing',
  '/review',
  '/campaigns',
];

/**
 * Primeiro segmento de rotas conhecidas da app.
 * Paths fora desta lista são tratados como públicos (404 sem forçar login).
 */
const KNOWN_APP_SEGMENTS = new Set([
  '404',
  'activity-kind-coverage',
  'agency-management',
  'minha-empresa',
  'comercial',
  'agents-dashboard',
  'ai-central',
  'ai-configuration',
  'approval-dashboard',
  'aprendizados',
  'audit-report',
  'automation-dashboard',
  'brainstorm',
  'briefing-campanha',
  'briefing-campanha-anual',
  'briefing-demo',
  'briefing-editor',
  'briefing-inicial',
  'briefings',
  'briefing-templates',
  'briefing-tokens',
  'caixa',
  'campaign',
  'campaign-insights',
  'campaigns',
  'campaigns-performance',
  'client',
  'client-activation',
  'clientarea',
  'client-brainstorm',
  'client-briefing',
  'client-campaign',
  'client-context',
  'clientdemo',
  'client-detail',
  'client-diagnostic',
  'client-documents',
  'cliente',
  'client-evolution',
  'client-financeiro',
  'client-learnings',
  'client-login',
  'client-planning',
  'clientportal',
  'client-portal',
  'client-portal-overview',
  'client-portal-service-documents',
  'client-portal-service-overview',
  'clients',
  'client-services',
  'client-set-password',
  'client-settings',
  'client-tasks',
  'client-unit',
  'communication-diagnosis',
  'connectivity-dashboard',
  'create-account',
  'create-agency',
  'custom-reports',
  'cycle-approval',
  'cycle-approval-manager',
  'cycle-closing',
  'cycle-plan',
  'cycle-report',
  'dashboard',
  'data-review',
  'delivery-workspace',
  'document',
  'e2e-golden-path',
  'e2e-test',
  'evolutionpanel',
  'financeiro',
  'financial-diagnosis',
  'financial-kpis',
  'hours-hub',
  'insights',
  'insights-editor',
  'invite-accept',
  'invites',
  'jobs-monitor',
  'learnings-manager',
  'library',
  'login',
  'mapping-wizard',
  'mensalidades',
  'my-account',
  'my-agency',
  'notfound',
  'notification-preferences',
  'onboarding',
  'passwordreset',
  'password-reset',
  'performance-kpis',
  'planejamento',
  'privacy-policy',
  'projectsettings',
  'public-approval',
  'public-briefing',
  'qa-dashboard',
  'review',
  'scope-editor',
  'scope-generator',
  'service-deliverables',
  'service-detail',
  'service-editor',
  'service-instance-editor',
  'service-policies',
  'services',
  'services-overview',
  'service-template-editor',
  'service-templates',
  'service-templates-viewer',
  'settings',
  'settings-agency-categories',
  'settings-agency-features',
  'settings-notifications',
  'settings-profile',
  'spa-test-dashboard',
  'support-library',
  'system-health',
  'tasks',
  'tasks-board',
  'tasks-manager',
  'team-management',
  'team-members',
  'terms-of-service',
  'test-briefing-access',
  'today',
  'unauthorized',
  'upload-center',
  'welcome',
  'workorders',
]);

function isPublicRoute(pathname) {
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    return true;
  }

  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return true;
  // Rota desconhecida → 404 público (sem bounce para login)
  return !KNOWN_APP_SEGMENTS.has(segment.toLowerCase());
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
          </NavigationProvider>
        </SessionProvider>
      </I18nProvider>
    </div>
  );
}

export default Layout;

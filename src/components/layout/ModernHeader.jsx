import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  LogOut,
  Menu,
  Users,
  ChevronDown,
  X,
  Building2,
  Plus,
  CheckSquare,
  Megaphone,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import TopbarTimerWidget from '@/components/tasks/TopbarTimerWidget';
import NotificationBell from '@/components/notifications/NotificationBell';
import GlobalSearch, { GlobalSearchTrigger } from '@/components/search/GlobalSearch';
import OperationBreadcrumb from '@/components/client/hub/OperationBreadcrumb';
import RecentClientsSwitcher from '@/components/navigation/RecentClientsSwitcher';
import { scanTaskDeadlineNotifications } from '@/lib/scanTaskDeadlineNotifications';
import { scanPipelineSlaEscalations } from '@/lib/scanPipelineSlaEscalations';
import { createPageUrl } from '@/utils';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { CLIENT_CONTEXT, GLOBAL_SHELL } from '@/lib/clientContextTheme';
import {
  buildQuickCreateTaskHref,
  buildQuickCreateClientHref,
  buildQuickCreateCampaignHref,
  buildShellClientBreadcrumbs,
} from '@/lib/shellNavigation';

export default function ModernHeader({
  context,
  contextClient,
  contextCampaign,
  onMenuClick,
}) {
  const location = useLocation();
  const { user, agencyId, logout, isAdmin, isOwner } = useSession();
  const isClientContext = context?.type === 'client' && Boolean(context?.clientId);
  const canManageTeam = Boolean(isAdmin?.() || isOwner?.() || ['owner', 'admin'].includes(user?.role || ''));
  const currentPage = location.pathname.split('/').pop() || location.pathname.substring(1);

  const campaignHref =
    isClientContext && context?.briefingId
      ? createPageUrl(
          buildClientCampaignHref({
            clientId: context.clientId,
            briefingId: context.briefingId,
          })
        )
      : null;

  const clientCrumbs = isClientContext
    ? buildShellClientBreadcrumbs({
        clientId: context.clientId,
        clientName: contextClient?.name,
        campaignName: contextCampaign?.name || null,
        campaignHref,
        pageKey: currentPage,
      })
    : [];

  const quickCreateTaskHref = buildQuickCreateTaskHref({
    clientId: isClientContext ? context.clientId : null,
    serviceId: isClientContext ? context.serviceId || null : null,
  });
  const quickCreateClientHref = buildQuickCreateClientHref();
  const quickCreateCampaignHref = isClientContext
    ? buildQuickCreateCampaignHref(context.clientId, {
        serviceId: context.serviceId || null,
      })
    : null;

  useEffect(() => {
    const uid = user?.id || user?.data?.id;
    if (!agencyId || !uid) return;

    let cancelled = false;
    const runScans = async () => {
      try {
        await scanTaskDeadlineNotifications({ agencyId, userId: uid });
        await scanPipelineSlaEscalations({ agencyId, userId: uid });
        if (!cancelled) {
          window.dispatchEvent(new CustomEvent('notifications:refresh'));
        }
      } catch (err) {
        console.warn('[ModernHeader] notification scans', err);
      }
    };

    runScans();

    const interval = setInterval(() => {
      runScans().catch(() => {});
    }, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agencyId, user?.id, user?.data?.id]);

  return (
    <header className="border-b bg-white/80 border-[#E8E5F5]/80">
      <div className="px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between min-h-14 sm:min-h-16 items-center gap-2 sm:gap-3 py-2 sm:py-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden rounded-full h-9 w-9 p-0 shrink-0"
              onClick={onMenuClick}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {isClientContext ? (
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <RecentClientsSwitcher
                  agencyId={agencyId}
                  currentClientId={context.clientId}
                  currentClientName={contextClient?.name}
                  className="shrink-0 hidden sm:inline-flex"
                />
                <RecentClientsSwitcher
                  agencyId={agencyId}
                  currentClientId={context.clientId}
                  currentClientName={contextClient?.name}
                  compact
                  className="shrink-0 sm:hidden"
                />
                <div className="min-w-0 flex-1 hidden md:block">
                  <OperationBreadcrumb crumbs={clientCrumbs} />
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center flex-1 gap-2 min-w-0 max-w-xl">
                <div className="flex-1 min-w-0 max-w-md">
                  <GlobalSearchTrigger />
                </div>
                <RecentClientsSwitcher agencyId={agencyId} className="shrink-0" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isClientContext ? (
              <div className="md:hidden">
                <RecentClientsSwitcher agencyId={agencyId} compact />
              </div>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full text-[#7A7595] hover:text-[#18162A] hover:bg-black/5"
                  aria-label="Criar"
                  title="Criar"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Criar</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={quickCreateTaskHref} className="flex items-center cursor-pointer">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Nova tarefa
                  </Link>
                </DropdownMenuItem>
                {!isClientContext ? (
                  <DropdownMenuItem asChild>
                    <Link to={quickCreateClientHref} className="flex items-center cursor-pointer">
                      <Users className="h-4 w-4 mr-2" />
                      Novo cliente
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {quickCreateCampaignHref ? (
                  <DropdownMenuItem asChild>
                    <Link to={quickCreateCampaignHref} className="flex items-center cursor-pointer">
                      <Megaphone className="h-4 w-4 mr-2" />
                      Nova campanha
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {isClientContext ? (
                  <DropdownMenuItem asChild>
                    <Link
                      to={createPageUrl(`planejamento?clientId=${context.clientId}`)}
                      className="flex items-center cursor-pointer"
                    >
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Abrir panorama
                    </Link>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            {isClientContext ? (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-full text-[#7A7595] hover:text-[#18162A] hover:bg-black/5"
              >
                <Link
                  to={createPageUrl('clients')}
                  aria-label={CLIENT_CONTEXT.exitLabel}
                  title={CLIENT_CONTEXT.exitLabel}
                >
                  <X className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}

            <TopbarTimerWidget />

            <NotificationBell />

            <div className={isClientContext ? '' : 'md:hidden'}>
              <GlobalSearchTrigger compact />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 pl-1 h-auto py-1.5 rounded-full hover:bg-black/5 shrink-0"
                  aria-label="Menu da conta"
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${GLOBAL_SHELL.avatarBg}`}>
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[#18162A] hidden sm:inline max-w-[120px] truncate">
                    {user?.full_name || user?.name || 'Usuário'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#7A7595] hidden sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-[#18162A] truncate">
                    {user?.full_name || user?.name || 'Usuário'}
                  </p>
                  <p className="text-xs text-[#7A7595] truncate">{user?.email || ''}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('my-account')} className="flex items-center cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Minha Conta
                  </Link>
                </DropdownMenuItem>
                {canManageTeam && (
                  <DropdownMenuItem asChild>
                    <Link
                      to={createPageUrl('minha-empresa?tab=equipe')}
                      className="flex items-center cursor-pointer"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Equipe
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('minha-empresa')} className="flex items-center cursor-pointer">
                    <Building2 className="h-4 w-4 mr-2" />
                    Minha empresa
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={
                      isClientContext
                        ? createPageUrl(`client-settings?clientId=${context.clientId}`)
                        : createPageUrl('settings')
                    }
                    className="flex items-center cursor-pointer"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <GlobalSearch preferredClientId={isClientContext ? context.clientId : null} />
    </header>
  );
}

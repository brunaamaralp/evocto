import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Building2, Menu, ChevronRight, Megaphone, Users, ChevronDown } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import TopbarTimerWidget from '@/components/tasks/TopbarTimerWidget';
import NotificationBell from '@/components/notifications/NotificationBell';
import GlobalSearch, { GlobalSearchTrigger } from '@/components/search/GlobalSearch';
import { scanTaskDeadlineNotifications } from '@/lib/scanTaskDeadlineNotifications';
import { scanPipelineSlaEscalations } from '@/lib/scanPipelineSlaEscalations';
import { createPageUrl } from '@/utils';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { CLIENT_CONTEXT, GLOBAL_SHELL } from '@/lib/clientContextTheme';

export default function ModernHeader({
  context,
  contextClient,
  contextCampaign,
  onMenuClick,
}) {
  const { user, agencyId, logout, isAdmin, isOwner } = useSession();
  const isClientContext = context?.type === 'client' && Boolean(context?.clientId);
  const canManageTeam = Boolean(isAdmin?.() || isOwner?.() || ['owner', 'admin'].includes(user?.role || ''));
  const showCampaignCrumb =
    isClientContext &&
    Boolean(context?.briefingId) &&
    Boolean(contextCampaign?.name);

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
    <header
      className={`border-b ${
        isClientContext
          ? 'bg-teal-50/60 border-teal-100'
          : 'bg-white/80 border-[#E8E5F5]/80'
      }`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden rounded-full h-9 w-9 p-0"
              onClick={onMenuClick}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {isClientContext ? (
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 ${CLIENT_CONTEXT.chip}`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Cliente
                </span>
                <Link
                  to={createPageUrl(`client-detail?clientId=${context.clientId}`)}
                  className="text-sm font-semibold text-teal-950 truncate hover:underline max-w-[140px] sm:max-w-[200px]"
                >
                  {contextClient?.name || 'Perfil do cliente'}
                </Link>
                {showCampaignCrumb && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-teal-700/60 shrink-0" />
                    <Megaphone className="w-3.5 h-3.5 text-teal-700/70 shrink-0 hidden sm:block" />
                    <Link
                      to={createPageUrl(
                        buildClientCampaignHref({
                          clientId: context.clientId,
                          briefingId: context.briefingId,
                        })
                      )}
                      className="text-sm font-semibold text-teal-900 truncate hover:underline max-w-[160px] sm:max-w-[240px]"
                    >
                      {contextCampaign.name}
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center flex-1 max-w-md">
                <GlobalSearchTrigger />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <TopbarTimerWidget />

            <NotificationBell />

            {!isClientContext && (
              <div className="md:hidden">
                <GlobalSearchTrigger compact />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 pl-1 h-auto py-1.5 rounded-full hover:bg-black/5"
                  aria-label="Menu da conta"
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center ${
                      isClientContext ? 'bg-teal-700' : GLOBAL_SHELL.avatarBg
                    }`}
                  >
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
                    <Link to={createPageUrl('team-management')} className="flex items-center cursor-pointer">
                      <Users className="h-4 w-4 mr-2" />
                      Equipe
                    </Link>
                  </DropdownMenuItem>
                )}
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

      {!isClientContext && <GlobalSearch />}
    </header>
  );
}

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, User, LogOut, Building2, Menu } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import TopbarTimerWidget from '@/components/tasks/TopbarTimerWidget';
import NotificationBell from '@/components/notifications/NotificationBell';
import { scanTaskDeadlineNotifications } from '@/lib/scanTaskDeadlineNotifications';
import { createPageUrl } from '@/utils';
import { CLIENT_CONTEXT, GLOBAL_SHELL } from '@/lib/clientContextTheme';

export default function ModernHeader({
  context,
  contextClient,
  onMenuClick,
}) {
  const { user, agencyId, logout } = useSession();
  const isClientContext = context?.type === 'client' && Boolean(context?.clientId);

  useEffect(() => {
    const uid = user?.id || user?.data?.id;
    if (!agencyId || !uid) return;

    let cancelled = false;
    (async () => {
      try {
        await scanTaskDeadlineNotifications({ agencyId, userId: uid });
        if (!cancelled) {
          window.dispatchEvent(new CustomEvent('notifications:refresh'));
        }
      } catch (err) {
        console.warn('[ModernHeader] deadline scan', err);
      }
    })();

    const interval = setInterval(() => {
      scanTaskDeadlineNotifications({ agencyId, userId: uid }).catch(() => {});
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
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${CLIENT_CONTEXT.chip}`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Cliente
                </span>
                <Link
                  to={createPageUrl(`client-detail?clientId=${context.clientId}`)}
                  className="text-sm font-semibold text-teal-950 truncate hover:underline"
                >
                  {contextClient?.name || 'Perfil do cliente'}
                </Link>
              </div>
            ) : (
              <div className="hidden md:flex items-center flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7595]" />
                  <input
                    type="search"
                    placeholder="Buscar…"
                    className="w-full h-10 pl-10 pr-4 rounded-full bg-[#F5F2FC] border border-transparent text-sm text-[#18162A] placeholder:text-[#7A7595] focus:outline-none focus:ring-2 focus:ring-[#6C47D8]/30 focus:border-[#AFA9EC] transition-shadow"
                    readOnly
                    aria-label="Buscar"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <TopbarTimerWidget />

            <NotificationBell />

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden rounded-full h-9 w-9 p-0"
            >
              <Search className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 pl-1">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center ${
                  isClientContext ? 'bg-teal-700' : GLOBAL_SHELL.avatarBg
                }`}
              >
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[#18162A] hidden sm:inline max-w-[120px] truncate">
                {user?.full_name || 'Usuário'}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="rounded-full h-9 w-9 p-0"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, User, LogOut, Building2 } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import TopbarTimerWidget from '@/components/tasks/TopbarTimerWidget';
import NotificationBell from '@/components/notifications/NotificationBell';
import { scanTaskDeadlineNotifications } from '@/lib/scanTaskDeadlineNotifications';
import { createPageUrl } from '@/utils';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';

export default function ModernHeader({
  context,
  contextClient,
  onMenuClick: _onMenuClick,
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
          ? 'bg-teal-50/80 border-teal-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            {isClientContext ? (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${CLIENT_CONTEXT.chip}`}
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
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Sistema
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <TopbarTimerWidget />

            <NotificationBell />

            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Search className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  isClientContext ? 'bg-teal-700' : 'bg-blue-500'
                }`}
              >
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {user?.full_name || 'Usuário'}
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

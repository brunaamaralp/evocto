import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, User, LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import TopbarTimerWidget from '@/components/tasks/TopbarTimerWidget';
import NotificationBell from '@/components/notifications/NotificationBell';
import { scanTaskDeadlineNotifications } from '@/lib/scanTaskDeadlineNotifications';

export default function ModernHeader() {
  const { user, agencyId, logout } = useSession();

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
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center" />

          <div className="flex items-center gap-2 sm:gap-4">
            <TopbarTimerWidget />

            <NotificationBell />

            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Search className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
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

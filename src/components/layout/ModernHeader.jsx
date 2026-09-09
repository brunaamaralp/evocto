import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, User, LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import TopbarTimerWidget from '@/components/tasks/TopbarTimerWidget';

export default function ModernHeader() {
  const { user, logout } = useSession();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center" />

          <div className="flex items-center gap-4">
            <TopbarTimerWidget />

            <Button variant="ghost" size="sm">
              <Search className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">
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

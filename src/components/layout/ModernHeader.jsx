import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, Settings, User, LogOut, ChevronDown } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';

export default function ModernHeader() {
  const { user, logout } = useSession();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - can be empty or have breadcrumbs */}
          <div className="flex items-center">
            {/* Breadcrumbs or page title can go here */}
          </div>

          {/* Right side - user actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <Button variant="ghost" size="sm">
              <Search className="h-5 w-5" />
            </Button>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.full_name || 'Usuário'}
              </span>
            </div>

            {/* Logout */}
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { safeGet } from '@/components/utils/safeGuards';
import { createPageUrl } from '@/utils';
import {
    LayoutDashboard, Users, Briefcase, FileText, Bot, Settings, LogOut, ChevronDown, ChevronRight, HelpCircle, BookOpen, BarChart3, HeartPulse,
    Home, Clock, ClipboardList, CheckSquare, User, Bell, Palette, Tag, Shield, Zap
} from 'lucide-react';
import { useT } from '@/components/i18n/I18nProvider';

const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/2967b924b_IMG_0421.PNG";

// Component for individual navigation items
const NavItem = ({ item, isActive, collapsed }) => {
  const Icon = item.icon;
  
  return (
    <NavLink
      to={item.href}
      className={({ isActive: active }) => 
        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          active
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`
      }
    >
      <Icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'} flex-shrink-0`} />
      {!collapsed && <span>{item.name}</span>}
    </NavLink>
  );
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const { user, logout, userName, isOwner, isAdmin } = useSession();
  const location = useLocation();
  const t = useT();

  const navigationItems = [
    { name: t('sidebar.dashboard', 'Dashboard'), href: '/dashboard', icon: Home },
    { name: t('sidebar.today', 'Today'), href: '/today', icon: Clock },
    { name: t('sidebar.clients', 'Clients'), href: '/clients', icon: Users },
    { name: t('sidebar.services', 'Services'), href: '/services', icon: Briefcase },
    { name: t('sidebar.service_templates', 'Templates'), href: '/service-templates', icon: ClipboardList },
    { name: t('sidebar.tasks_manager', 'Tasks'), href: '/tasks-manager', icon: CheckSquare },
    { name: t('sidebar.library', 'Library'), href: '/library', icon: BookOpen },
  ];

  // Settings items array
  const settingsItems = [
    { name: t('sidebar.settings.profile', 'Profile'), href: '/settings-profile', icon: User },
    { name: t('sidebar.settings.notifications', 'Notifications'), href: '/settings-notifications', icon: Bell },
    { name: t('sidebar.settings.agency_identity', 'Agency Identity'), href: '/settings-agency-identity', icon: Palette },
    { name: t('sidebar.settings.categories', 'Service Categories'), href: '/settings-agency-categories', icon: Tag },
    { name: t('sidebar.settings.policies', 'Agency Policies'), href: '/settings-agency-policies', icon: Shield },
    { name: t('sidebar.settings.features', 'Features'), href: '/settings-agency-features', icon: Zap }
  ];

  // Check if current path is in settings
  const isInSettings = location.pathname.startsWith('/settings');
  
  // Auto-expand settings if we're in a settings page
  React.useEffect(() => {
    if (isInSettings) {
      setSettingsExpanded(true);
    }
  }, [isInSettings]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className={`bg-white shadow-sm border-r border-gray-200 h-full flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo and collapse button */}
      <div className={`p-4 border-b border-gray-200 ${collapsed ? 'px-2' : ''}`}>
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className={`${collapsed ? 'w-8 h-8' : 'w-8 h-8 mr-3'} rounded`} 
            />
            {!collapsed && <span className="text-lg font-bold text-gray-900">InsightFlow</span>}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 rotate-180" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {/* Main navigation items */}
        {navigationItems.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} />
        ))}

        {/* Settings Section */}
        <div className="pt-4">
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors ${
              isInSettings ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <Settings className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'} flex-shrink-0`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Settings</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${settingsExpanded ? 'rotate-90' : ''}`} />
              </>
            )}
          </button>
          
          {/* Settings subitems */}
          {!collapsed && settingsExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {settingsItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) => 
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User profile section */}
      <div className={`p-4 border-t border-gray-200 ${collapsed ? 'px-2' : ''}`}>
        <div className="flex items-center">
          <div className={`${collapsed ? 'w-8 h-8' : 'w-8 h-8 mr-3'} bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium`}>
            {safeGet(userName, '0', 'U').toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{safeGet(user, 'email', '')}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`${collapsed ? 'ml-0' : 'ml-2'} p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700`}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
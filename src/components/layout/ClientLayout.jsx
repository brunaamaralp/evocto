import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LogOut, User, Settings, Home, FileText, 
  CheckCircle, BarChart3, HelpCircle, ChevronDown,
  Bell, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Agency, Client } from '@/api/entities';
import { toast } from 'sonner';
import NotificationsBell from '@/components/client_portal/NotificationsBell';
import HelpSupport from '@/components/client_portal/HelpSupport';

export function ClientLayout({ children }) {
  const { user, logout } = useSession();
  const location = useLocation();
  const [agency, setAgency] = useState(null);
  const [client, setClient] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadClientData = useCallback(async () => {
    try {
      if (user?.clientId) {
        // Buscar dados do cliente
        const clientData = await Client.get(user.clientId);
        setClient(clientData);

        // Buscar dados da agência
        if (clientData?.agencyId) {
          const agencyData = await Agency.get(clientData.agencyId);
          setAgency(agencyData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.clientId]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const navigation = [
    {
      name: 'Visão Geral',
      href: createPageUrl('client-portal'),
      icon: Home,
      current: location.pathname === createPageUrl('client-portal') && !location.search.includes('tab=')
    },
    {
      name: 'Briefing',
      href: `${createPageUrl('client-portal')}?tab=briefing`,
      icon: FileText,
      current: location.search.includes('tab=briefing')
    },
    {
      name: 'Aprovações',
      href: `${createPageUrl('client-portal')}?tab=approvals`,
      icon: CheckCircle,
      current: location.search.includes('tab=approvals')
    },
    {
      name: 'Relatórios',
      href: `${createPageUrl('client-portal')}?tab=reports`,
      icon: BarChart3,
      current: location.search.includes('tab=reports')
    }
  ];

  const getUserInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CL';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header 
        className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50"
        style={{
          background: agency?.primaryColor ? 
            `linear-gradient(135deg, ${agency.primaryColor}15 0%, white 100%)` : 
            undefined
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo e Branding da Agência */}
            <div className="flex items-center">
              <Link to={createPageUrl('client-portal')} className="flex items-center group">
                {agency?.logoUrl ? (
                  <img
                    src={agency.logoUrl}
                    alt={agency.agencyName}
                    className="h-10 w-auto transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div 
                    className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{
                      background: agency?.primaryColor ? 
                        `linear-gradient(135deg, ${agency.primaryColor} 0%, ${agency.secondaryColor || '#8B5CF6'} 100%)` :
                        undefined
                    }}
                  >
                    <span className="text-white font-bold text-sm">
                      {agency?.agencyName?.slice(0, 2) || 'AG'}
                    </span>
                  </div>
                )}
                <div className="ml-3 hidden sm:block">
                  <span className="text-lg font-semibold text-gray-900">
                    {agency?.agencyName || 'Portal do Cliente'}
                  </span>
                  <p className="text-xs text-gray-500 -mt-1">
                    Portal do Cliente
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.current
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              {/* Help & FAQ */}
              <div className="hidden md:flex items-center space-x-2">
                <HelpSupport />
              </div>

              {/* Notifications */}
              <NotificationsBell />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
                        {getUserInitials(user?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.full_name?.split(' ')[0] || 'Cliente'}
                      </p>
                      {client?.company && (
                        <p className="text-xs text-gray-500">
                          {client.company}
                        </p>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium">{user?.full_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {client?.company && (
                      <p className="text-xs text-blue-600 mt-1">{client.company}</p>
                    )}
                  </div>
                  
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('client-portal')} className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  
                  <div className="md:hidden">
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Ajuda
                    </DropdownMenuItem>
                  </div>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-200 bg-white"
            >
              <nav className="px-4 py-3 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <span className="text-sm text-gray-500">
                © {new Date().getFullYear()} {agency?.agencyName || 'Agência'}. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <Link to="#" className="hover:text-gray-700 transition-colors">
                Política de Privacidade
              </Link>
              <span>•</span>
              <Link to="#" className="hover:text-gray-700 transition-colors">
                Termos de Uso
              </Link>
              <span>•</span>
              <HelpSupport />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
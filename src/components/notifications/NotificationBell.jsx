import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Notification } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell, Check, X, AlertTriangle, Info, 
  CheckCircle, Clock, User, Calendar,
  ExternalLink, Settings, Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Ícones por tipo de notificação
const NOTIFICATION_ICONS = {
  task_assigned: User,
  task_due_soon: Clock,
  task_overdue: AlertTriangle,
  task_completed: CheckCircle,
  task_status_changed: Info,
  cycle_tasks_assigned: Calendar,
  default: Bell
};

// Cores por severidade
const SEVERITY_COLORS = {
  info: 'text-blue-600 bg-blue-50',
  warn: 'text-yellow-600 bg-yellow-50',
  critical: 'text-red-600 bg-red-50'
};

// Componente de item de notificação
const NotificationItem = ({ notification, onMarkAsRead, onDismiss, onClick }) => {
  const IconComponent = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
  const severityClass = SEVERITY_COLORS[notification.severity] || SEVERITY_COLORS.info;
  
  const timeAgo = format(new Date(notification.created_date), 'dd/MM HH:mm', { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "p-4 border-l-4 hover:bg-gray-50 transition-colors cursor-pointer",
        !notification.readAt && "bg-blue-50 border-l-blue-500",
        notification.readAt && "border-l-gray-200"
      )}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className={cn("p-2 rounded-lg", severityClass)}>
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={cn(
                "text-sm font-medium",
                !notification.readAt ? "text-gray-900" : "text-gray-600"
              )}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                {notification.context}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {timeAgo}
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1 ml-2">
              {!notification.readAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="h-6 w-6 p-0 hover:bg-green-100"
                >
                  <Check className="w-3 h-3 text-green-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(notification.id);
                }}
                className="h-6 w-6 p-0 hover:bg-red-100"
              >
                <X className="w-3 h-3 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente principal do sino de notificações
export const NotificationBell = () => {
  const { user } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Carregar notificações
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const allNotifications = await Notification.filter(
        { userId: user.id },
        '-created_date',
        20 // Últimas 20 notificações
      );

      setNotifications(allNotifications);
      
      const unread = allNotifications.filter(n => !n.readAt).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Marcar como lida
  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, {
        readAt: new Date().toISOString()
      });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.readAt);
    
    try {
      for (const notification of unreadNotifications) {
        await Notification.update(notification.id, {
          readAt: new Date().toISOString()
        });
      }
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  };

  // Dispensar notificação (deletar)
  const dismissNotification = async (notificationId) => {
    try {
      await Notification.delete(notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.readAt) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
    } catch (error) {
      console.error('Erro ao dispensar notificação:', error);
    }
  };

  // Clique na notificação
  const handleNotificationClick = (notification) => {
    // Marcar como lida
    if (!notification.readAt) {
      markAsRead(notification.id);
    }
    
    // Navegar para o link
    if (notification.href) {
      window.location.href = notification.href;
    }
    
    // Fechar dropdown
    setIsOpen(false);
  };

  // Carregar notificações ao montar
  useEffect(() => {
    loadNotifications();
    
    // Recarregar a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 p-0">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Carregando...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDismiss={dismissNotification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Nenhuma notificação</h3>
                <p className="text-sm text-gray-500">Você está em dia com tudo!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
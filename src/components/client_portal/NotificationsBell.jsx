import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Bell, BellRing, CheckCircle, FileText, 
  BarChart3, AlertTriangle, X, Check 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Notification } from '@/api/entities';
import { toast } from 'sonner';

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const notificationsList = await Notification.filter({}, '-created_date', 10);
      setNotifications(notificationsList);
      
      const unread = notificationsList.filter(n => !n.readAt).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, {
        readAt: new Date().toISOString()
      });
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, readAt: new Date().toISOString() }
          : n
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      
      const unreadNotifications = notifications.filter(n => !n.readAt);
      
      await Promise.all(
        unreadNotifications.map(n => 
          Notification.update(n.id, {
            readAt: new Date().toISOString()
          })
        )
      );
      
      setNotifications(prev => prev.map(n => ({
        ...n,
        readAt: n.readAt || new Date().toISOString()
      })));
      
      setUnreadCount(0);
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast.error('Erro ao marcar notificações como lidas');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already
    if (!notification.readAt) {
      await markAsRead(notification.id);
    }
    
    // Navigate to notification target
    if (notification.href) {
      window.location.href = notification.href;
    }
    
    setOpen(false);
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      'rc_created': FileText,
      'rc_expiring': AlertTriangle,
      'plan_pending': CheckCircle,
      'plan_approved': CheckCircle,
      'plan_rejected': AlertTriangle,
      'cycle_due': BarChart3,
      'briefing_review': FileText,
      'learning_triage': FileText,
      'health_alert': AlertTriangle
    };
    
    return iconMap[type] || Bell;
  };

  const getNotificationColor = (type, severity) => {
    if (severity === 'critical') return 'text-red-600 bg-red-50';
    if (severity === 'warn') return 'text-yellow-600 bg-yellow-50';
    
    const colorMap = {
      'rc_expiring': 'text-orange-600 bg-orange-50',
      'plan_approved': 'text-green-600 bg-green-50',
      'plan_rejected': 'text-red-600 bg-red-50',
      'health_alert': 'text-red-600 bg-red-50'
    };
    
    return colorMap[type] || 'text-blue-600 bg-blue-50';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-blue-600" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
            >
              <span className="text-xs text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={5}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600">
                Você tem {unreadCount} notificação{unreadCount !== 1 ? 'ões' : ''} não lida{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const colorClasses = getNotificationColor(notification.type, notification.severity);
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                        !notification.readAt ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${colorClasses}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.readAt ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            
                            {!notification.readAt && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 ml-2 flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.context}
                          </p>
                          
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDistanceToNow(new Date(notification.created_date), { 
                              locale: ptBR, 
                              addSuffix: true 
                            })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 text-sm">Nenhuma notificação</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Você será notificado sobre atualizações importantes aqui
                  </p>
                </div>
              )}
            </AnimatePresence>
          </CardContent>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-blue-600 hover:text-blue-800"
                onClick={() => {
                  setOpen(false);
                  // Navigate to full notifications page if it exists
                }}
              >
                Ver todas as notificações
              </Button>
            </div>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
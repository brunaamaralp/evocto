import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Notification } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Bell, 
  CheckCircle2, 
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeLabels = {
  rc_created: 'Link de aprovação criado',
  rc_expiring: 'Link de aprovação expirando',
  plan_pending: 'Plano pendente',
  plan_approved: 'Plano aprovado',
  plan_rejected: 'Ajustes solicitados no plano',
  cycle_due: 'Prazo de ciclo',
  workorder_due: 'Prazo de job',
  briefing_review: 'Briefing para revisão',
  learning_triage: 'Aprendizado para triagem',
  health_alert: 'Alerta de performance'
};

const NotificationItem = ({ notification, onMarkAsRead }) => {
  const typeLabel = typeLabels[notification.type] || notification.type;
  const isUnread = !notification.readAt;
  
  const handleClick = async () => {
    if (isUnread) {
      await onMarkAsRead(notification.id);
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        isUnread 
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
          : 'bg-white border-slate-200 hover:bg-slate-50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${notification.severity === 'critical' ? 'text-red-500' : 
                         notification.severity === 'warn' ? 'text-yellow-500' : 'text-blue-500'}`}>
          {notification.type === 'rc_expiring' ? <Clock className="w-4 h-4" /> :
           notification.type === 'plan_approved' ? <CheckCircle2 className="w-4 h-4" /> :
           notification.type === 'health_alert' ? <AlertTriangle className="w-4 h-4" /> :
           <Bell className="w-4 h-4" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-900 line-clamp-1">
              {notification.title}
            </p>
            {isUnread && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2 ml-2" />
            )}
          </div>
          
          <p className="text-xs text-slate-500 mt-1">{typeLabel}</p>
          
          {notification.context && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              {notification.context}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">
              {format(new Date(notification.created_date), 'dd/MM HH:mm', { locale: ptBR })}
            </span>
            
            {notification.href && (
              <Button
                asChild
                size="sm" 
                variant="ghost"
                className="text-xs h-6 px-2"
              >
                <Link to={notification.href}>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NotificationCenter() {
  const { user, agency } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && agency?.id) {
      loadNotifications();
    }
  }, [user?.id, agency?.id]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await Notification.filter(
        { 
          userId: user.id, 
          agencyId: agency.id 
        }, 
        '-created_date', 
        20
      );
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.readAt).map(n => n.id);
      
      await Promise.all(
        unreadIds.map(id => 
          Notification.update(id, { readAt: new Date().toISOString() })
        )
      );
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="w-80 max-h-96 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-slate-900">Notificações</h3>
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
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, Clock, FileUp, CheckSquare, MessageSquare,
  ArrowRight, Bell, Calendar, ExternalLink
} from 'lucide-react';
import { ApprovalRequest } from '@/api/entities';
import { Task } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';

const ACTION_TYPES = {
  'approval': {
    icon: CheckSquare,
    label: 'Aprovação',
    color: 'text-orange-600 bg-orange-100',
    urgentColor: 'text-red-600 bg-red-100'
  },
  'upload': {
    icon: FileUp,
    label: 'Upload',
    color: 'text-blue-600 bg-blue-100',
    urgentColor: 'text-red-600 bg-red-100'
  },
  'feedback': {
    icon: MessageSquare,
    label: 'Resposta',
    color: 'text-purple-600 bg-purple-100',
    urgentColor: 'text-red-600 bg-red-100'
  },
  'meeting': {
    icon: Calendar,
    label: 'Reunião',
    color: 'text-green-600 bg-green-100',
    urgentColor: 'text-red-600 bg-red-100'
  }
};

export default function ClientPendingActions({ clientId, serviceId, onActionComplete }) {
  const { user } = useSession();
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPendingActions = useCallback(async () => {
    try {
      setLoading(true);
      const actions = [];

      // Aprovações pendentes
      const approvals = await ApprovalRequest.filter({
        agencyId: user.data.agencyId,
        clientId: clientId,
        status: 'pending'
      });

      approvals.forEach(approval => {
        const isUrgent = approval.expiresAt && 
          new Date(approval.expiresAt) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 dias

        actions.push({
          id: approval.id,
          type: 'approval',
          title: approval.title || 'Aprovação Pendente',
          description: approval.description || approval.customMessage,
          dueDate: approval.expiresAt,
          isUrgent,
          href: `/public-approval/${approval.token}`,
          metadata: {
            contentType: approval.contentType,
            approverEmail: approval.approverEmail
          }
        });
      });

      // Tarefas que requerem ação do cliente
      const clientTasks = await Task.filter({
        agencyId: user.data.agencyId,
        clientId: clientId,
        status: { $in: ['todo', 'in_progress'] },
        assignedTo: user.email // Assumindo que cliente tem tasks atribuídas
      });

      clientTasks.forEach(task => {
        const isUrgent = task.dueDate && 
          new Date(task.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 dias

        let actionType = 'feedback';
        if (task.type === 'upload_documents') actionType = 'upload';
        if (task.type === 'meeting_attendance') actionType = 'meeting';

        actions.push({
          id: task.id,
          type: actionType,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          isUrgent,
          href: `/client-tasks?taskId=${task.id}`,
          metadata: {
            taskType: task.type,
            priority: task.priority
          }
        });
      });

      // Ordenar por urgência e data
      actions.sort((a, b) => {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        
        const aDate = new Date(a.dueDate || Date.now());
        const bDate = new Date(b.dueDate || Date.now());
        return aDate - bDate;
      });

      setPendingActions(actions);
      
    } catch (error) {
      console.error('Erro ao carregar ações pendentes:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId, user?.data?.agencyId, user?.email]);

  useEffect(() => {
    if (clientId && user?.data?.agencyId) {
      loadPendingActions();
    }
  }, [loadPendingActions, clientId, user?.data?.agencyId]);

  const formatTimeRemaining = (dueDate) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = Math.ceil((due - now) / (1000 * 60 * 60));
    
    if (diffHours < 0) return 'Vencido';
    if (diffHours < 24) return `${diffHours}h restantes`;
    if (diffHours < 48) return 'Vence amanhã';
    
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays} dias restantes`;
  };

  const handleActionClick = (action) => {
    if (action.href.startsWith('http') || action.href.startsWith('/public-')) {
      window.open(action.href, '_blank');
    } else {
      // Navigate internally
      window.location.href = action.href;
    }
    
    if (onActionComplete) {
      onActionComplete(action);
    }
  };

  const urgentActions = pendingActions.filter(a => a.isUrgent);
  const regularActions = pendingActions.filter(a => !a.isUrgent);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Urgent Actions Alert */}
      {urgentActions.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atenção!</strong> Você tem {urgentActions.length} ação{urgentActions.length > 1 ? 'ões' : ''} urgente{urgentActions.length > 1 ? 's' : ''} que precisa{urgentActions.length > 1 ? 'm' : ''} ser realizada{urgentActions.length > 1 ? 's' : ''}.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Suas Pendências
            </div>
            
            {pendingActions.length > 0 && (
              <Badge variant={urgentActions.length > 0 ? 'destructive' : 'default'}>
                {pendingActions.length} {pendingActions.length === 1 ? 'pendência' : 'pendências'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {pendingActions.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Tudo em dia! 🎉
              </h3>
              <p className="text-gray-600">
                Você não tem nenhuma ação pendente no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Urgent Actions First */}
              {urgentActions.map((action) => {
                const ActionIcon = ACTION_TYPES[action.type]?.icon || Clock;
                const timeRemaining = formatTimeRemaining(action.dueDate);
                
                return (
                  <div
                    key={`urgent-${action.id}`}
                    className="p-4 border-2 border-red-200 bg-red-50 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${ACTION_TYPES[action.type]?.urgentColor}`}>
                          <ActionIcon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{action.title}</h4>
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              URGENTE
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-2">{action.description}</p>
                          
                          {timeRemaining && (
                            <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
                              <Clock className="w-4 h-4" />
                              {timeRemaining}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleActionClick(action)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Resolver
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {/* Regular Actions */}
              {regularActions.map((action) => {
                const ActionIcon = ACTION_TYPES[action.type]?.icon || Clock;
                const timeRemaining = formatTimeRemaining(action.dueDate);
                
                return (
                  <div
                    key={`regular-${action.id}`}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${ACTION_TYPES[action.type]?.color}`}>
                          <ActionIcon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{action.title}</h4>
                            <Badge variant="outline">
                              {ACTION_TYPES[action.type]?.label}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-2">{action.description}</p>
                          
                          {timeRemaining && (
                            <div className="flex items-center gap-1 text-gray-500 text-sm">
                              <Clock className="w-4 h-4" />
                              {timeRemaining}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActionClick(action)}
                      >
                        Ver
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

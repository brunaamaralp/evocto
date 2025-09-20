import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Play, Pause, CheckCircle, AlertTriangle, RotateCcw,
  MoreHorizontal, Clock, Eye, UserCheck, XCircle
} from 'lucide-react';
import { TaskStateMachine } from './TaskStateMachine';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

export default function TaskActionButtons({ 
  task, 
  onTaskUpdated, 
  size = 'sm', 
  variant = 'default' 
}) {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  const taskStateMachine = new TaskStateMachine(task, user);

  // Determinar ações disponíveis baseado no estado atual
  const getAvailableActions = () => {
    const actions = [];

    switch (task.status) {
      case 'backlog':
      case 'todo':
        actions.push({
          key: 'start',
          label: 'Iniciar',
          icon: Play,
          color: 'text-blue-600 hover:text-blue-700',
          primary: true
        });
        break;

      case 'in_progress':
        actions.push(
          {
            key: 'review',
            label: 'Enviar para Revisão',
            icon: Eye,
            color: 'text-purple-600 hover:text-purple-700',
            primary: true
          },
          {
            key: 'complete',
            label: 'Concluir',
            icon: CheckCircle,
            color: 'text-green-600 hover:text-green-700'
          }
        );
        break;

      case 'in_review':
        if (task.reviewerIds?.includes(user.id) || user.data?.role === 'owner') {
          actions.push(
            {
              key: 'approve',
              label: 'Aprovar',
              icon: CheckCircle,
              color: 'text-green-600 hover:text-green-700',
              primary: true
            },
            {
              key: 'reject',
              label: 'Rejeitar',
              icon: XCircle,
              color: 'text-red-600 hover:text-red-700'
            }
          );
        }
        break;

      case 'completed':
        actions.push({
          key: 'reopen',
          label: 'Reabrir',
          icon: RotateCcw,
          color: 'text-orange-600 hover:text-orange-700'
        });
        break;

      case 'blocked':
        actions.push({
          key: 'unblock',
          label: 'Desbloquear',
          icon: Play,
          color: 'text-blue-600 hover:text-blue-700',
          primary: true
        });
        break;
    }

    // Ação de bloquear (disponível para most statuses except blocked/completed)
    if (!['blocked', 'completed', 'cancelled'].includes(task.status)) {
      actions.push({
        key: 'block',
        label: 'Bloquear',
        icon: AlertTriangle,
        color: 'text-red-600 hover:text-red-700',
        secondary: true
      });
    }

    return actions;
  };

  const handleAction = async (actionKey) => {
    if (loading) return;

    try {
      setLoading(true);

      switch (actionKey) {
        case 'start':
          await taskStateMachine.start();
          break;

        case 'review':
          await taskStateMachine.sendForReview();
          break;

        case 'complete':
          await taskStateMachine.complete();
          break;

        case 'approve':
          await taskStateMachine.approve();
          break;

        case 'reject':
          await taskStateMachine.reject('Rejeitado durante revisão');
          break;

        case 'unblock':
          await taskStateMachine.unblock();
          break;

        case 'block':
          setShowBlockDialog(true);
          return;

        case 'reopen':
          setShowReopenDialog(true);
          return;

        default:
          console.warn(`Ação não reconhecida: ${actionKey}`);
          return;
      }

      // Notificar componente pai sobre atualização
      if (onTaskUpdated) {
        onTaskUpdated();
      }

    } catch (error) {
      console.error(`Erro ao executar ação ${actionKey}:`, error);
      toast.error(`Erro ao ${actionKey === 'complete' ? 'concluir' : actionKey} tarefa: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) {
      toast.error('Motivo do bloqueio é obrigatório');
      return;
    }

    try {
      setLoading(true);
      await taskStateMachine.block({ reason: blockReason });
      setShowBlockDialog(false);
      setBlockReason('');
      
      if (onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (error) {
      console.error('Erro ao bloquear tarefa:', error);
      toast.error('Erro ao bloquear tarefa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      toast.error('Motivo da reabertura é obrigatório');
      return;
    }

    try {
      setLoading(true);
      await taskStateMachine.reopen({ reason: reopenReason });
      setShowReopenDialog(false);
      setReopenReason('');
      
      if (onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error);
      toast.error('Erro ao reabrir tarefa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const actions = getAvailableActions();
  const primaryActions = actions.filter(a => a.primary);
  const secondaryActions = actions.filter(a => !a.primary);

  // Verificar se estamos em ambiente de desenvolvimento (simples check)
  const isDevelopment = window?.location?.hostname === 'localhost' || 
                        window?.location?.hostname === '127.0.0.1' ||
                        window?.location?.hostname?.includes('localhost');

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Ações primárias como botões diretos */}
        {primaryActions.slice(0, 2).map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.key}
              size={size}
              variant={variant === 'outline' ? 'outline' : 'default'}
              onClick={() => handleAction(action.key)}
              disabled={loading}
              className={`${action.color} flex items-center gap-1`}
            >
              <Icon className="w-4 h-4" />
              {size !== 'sm' && action.label}
            </Button>
          );
        })}

        {/* Menu dropdown para ações adicionais */}
        {(secondaryActions.length > 0 || primaryActions.length > 2) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size={size} 
                variant="outline" 
                disabled={loading}
                className="p-2"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {primaryActions.slice(2).map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.key}
                    onClick={() => handleAction(action.key)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
              
              {primaryActions.length > 2 && secondaryActions.length > 0 && (
                <DropdownMenuSeparator />
              )}
              
              {secondaryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.key}
                    onClick={() => handleAction(action.key)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Badge de versão para debug (apenas em dev) */}
        {isDevelopment && (
          <Badge variant="outline" className="text-xs">
            v{task.transition_version}
          </Badge>
        )}
      </div>

      {/* Dialog para bloquear tarefa */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Motivo do Bloqueio *
              </label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Descreva o motivo do bloqueio..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBlockDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBlock}
                disabled={loading || !blockReason.trim()}
              >
                {loading ? 'Bloqueando...' : 'Bloquear Tarefa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para reabrir tarefa */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Motivo da Reabertura *
              </label>
              <Textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Explique por que esta tarefa precisa ser reaberta..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReopenDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReopen}
                disabled={loading || !reopenReason.trim()}
              >
                {loading ? 'Reabrindo...' : 'Reabrir Tarefa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
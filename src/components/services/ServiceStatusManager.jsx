import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play, Pause, PauseCircle, CheckCircle, RotateCcw, 
  XCircle, Archive, AlertTriangle, ChevronDown,
  Clock, Settings, Loader2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import ServiceStateMachine from './ServiceStateMachine';

const STATUS_CONFIGS = {
  draft: {
    label: 'Rascunho',
    color: 'bg-gray-100 text-gray-800',
    icon: Settings,
    description: 'Serviço em configuração'
  },
  active: {
    label: 'Ativo',
    color: 'bg-green-100 text-green-800',
    icon: Play,
    description: 'Em execução'
  },
  paused: {
    label: 'Pausado',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Pause,
    description: 'Pausado operacionalmente'
  },
  on_hold: {
    label: 'Em Espera',
    color: 'bg-orange-100 text-orange-800',
    icon: PauseCircle,
    description: 'Pausado administrativamente'
  },
  completed: {
    label: 'Concluído',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle,
    description: 'Todas as fases concluídas'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    description: 'Interrompido'
  },
  archived: {
    label: 'Arquivado',
    color: 'bg-slate-100 text-slate-800',
    icon: Archive,
    description: 'Movido para histórico'
  }
};

const TRANSITION_CONFIGS = {
  ACTIVATE: {
    label: 'Ativar Serviço',
    icon: Play,
    variant: 'default',
    description: 'Inicia a execução do serviço'
  },
  PAUSE_OPERATIONAL: {
    label: 'Pausar (Operacional)',
    icon: Pause,
    variant: 'secondary',
    description: 'Pausa temporária - bloqueia tarefas'
  },
  PAUSE_ADMIN: {
    label: 'Colocar em Espera',
    icon: PauseCircle,
    variant: 'secondary',
    description: 'Pausa administrativa - não bloqueia tarefas'
  },
  RESUME_OPERATIONAL: {
    label: 'Retomar (Operacional)',
    icon: Play,
    variant: 'default',
    description: 'Retoma execução - desbloqueia tarefas'
  },
  RESUME_ADMIN: {
    label: 'Retomar da Espera',
    icon: Play,
    variant: 'default',
    description: 'Retoma execução administrativa'
  },
  COMPLETE: {
    label: 'Concluir Serviço',
    icon: CheckCircle,
    variant: 'default',
    description: 'Finaliza todas as fases'
  },
  REOPEN: {
    label: 'Reabrir Serviço',
    icon: RotateCcw,
    variant: 'outline',
    description: 'Reabre serviço finalizado'
  },
  CANCEL: {
    label: 'Cancelar Serviço',
    icon: XCircle,
    variant: 'destructive',
    description: 'Interrompe execução'
  }
};

export default function ServiceStatusManager({ service, onServiceUpdate }) {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [currentTransition, setCurrentTransition] = useState(null);
  const [reason, setReason] = useState('');

  const stateMachine = new ServiceStateMachine(service, user);
  const currentStatus = service.service_status || 'draft';
  const statusConfig = STATUS_CONFIGS[currentStatus];
  const availableTransitions = stateMachine.getAvailableTransitions();

  const handleTransition = async (transitionType, requiresReason = false) => {
    if (requiresReason) {
      setCurrentTransition(transitionType);
      setShowReasonDialog(true);
      return;
    }

    await executeTransition(transitionType);
  };

  const executeTransition = async (transitionType, transitionReason = '') => {
    setLoading(true);
    
    try {
      let result;

      switch (transitionType) {
        case 'ACTIVATE':
          result = await stateMachine.activate();
          break;
        case 'PAUSE_OPERATIONAL':
          result = await stateMachine.pauseOperational();
          break;
        case 'PAUSE_ADMIN':
          result = await stateMachine.pauseAdministrative();
          break;
        case 'RESUME_OPERATIONAL':
          result = await stateMachine.resumeOperational();
          break;
        case 'RESUME_ADMIN':
          result = await stateMachine.resumeAdministrative();
          break;
        case 'COMPLETE':
          result = await stateMachine.complete();
          break;
        case 'REOPEN':
          result = await stateMachine.reopen(transitionReason);
          break;
        case 'CANCEL':
          result = await stateMachine.cancel(transitionReason);
          break;
        default:
          throw new Error(`Transição não implementada: ${transitionType}`);
      }

      if (result.success) {
        const actionsList = result.actions?.join(', ') || '';
        toast.success(`${TRANSITION_CONFIGS[transitionType].label} executado com sucesso. ${actionsList}`);
        
        // Atualizar serviço na tela pai
        if (onServiceUpdate) {
          onServiceUpdate();
        }
      } else {
        // Erros já foram mostrados via toast dentro da state machine
      }

    } catch (error) {
      console.error(`Erro na transição ${transitionType}:`, error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
      setShowReasonDialog(false);
      setCurrentTransition(null);
      setReason('');
    }
  };

  const handleReasonSubmit = () => {
    if (!reason.trim()) {
      toast.error('Motivo é obrigatório');
      return;
    }

    executeTransition(currentTransition, reason.trim());
  };

  const StatusIcon = statusConfig?.icon || Info;

  return (
    <div className="space-y-4">
      {/* Status atual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <StatusIcon className="w-5 h-5" />
            Status do Serviço
            
            {service.overdue && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Atrasado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
                {statusConfig?.label || currentStatus}
              </Badge>
              <span className="text-sm text-gray-600">
                {statusConfig?.description || 'Status desconhecido'}
              </span>
            </div>

            {/* Ações disponíveis */}
            {availableTransitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={loading}
                    className="flex items-center gap-1"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Ações
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {availableTransitions.map((transition, index) => {
                    const config = TRANSITION_CONFIGS[transition];
                    if (!config) return null;

                    const TransitionIcon = config.icon;
                    const requiresReason = ['REOPEN', 'CANCEL'].includes(transition);

                    return (
                      <DropdownMenuItem
                        key={transition}
                        onClick={() => handleTransition(transition, requiresReason)}
                        className={`flex items-center gap-2 ${
                          config.variant === 'destructive' ? 'text-red-600' : ''
                        }`}
                      >
                        <TransitionIcon className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-gray-500">{config.description}</div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Informações adicionais do status */}
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            {service.actual_start_date && (
              <div>Iniciado em: {new Date(service.actual_start_date).toLocaleDateString('pt-BR')}</div>
            )}
            {service.paused_at && (
              <div>Pausado em: {new Date(service.paused_at).toLocaleDateString('pt-BR')}</div>
            )}
            {service.actual_end_date && (
              <div>Concluído em: {new Date(service.actual_end_date).toLocaleDateString('pt-BR')}</div>
            )}
            {service.reopened_at && (
              <div>Reaberto em: {new Date(service.reopened_at).toLocaleDateString('pt-BR')}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para inserir motivo */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentTransition && TRANSITION_CONFIGS[currentTransition]?.label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">
                {currentTransition === 'REOPEN' ? 'Motivo da Reabertura' : 'Motivo do Cancelamento'}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo para esta ação..."
                rows={3}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {currentTransition === 'REOPEN' 
                  ? 'A reabertura será registrada no histórico de auditoria e irá reativar a última fase concluída.'
                  : 'O cancelamento irá interromper todas as tarefas e fases ativas do serviço.'
                }
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowReasonDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleReasonSubmit}
                disabled={loading}
                variant={currentTransition === 'CANCEL' ? 'destructive' : 'default'}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
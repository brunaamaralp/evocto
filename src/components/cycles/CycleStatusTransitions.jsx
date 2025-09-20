import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Clock, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export const CYCLE_STATUS_FLOW = {
  planning: {
    label: 'Planejamento',
    icon: FileText,
    color: 'bg-blue-100 text-blue-800',
    description: 'Definindo estratégias e prioridades do ciclo',
    nextStates: ['pending_approval'],
    actions: [
      {
        label: 'Finalizar Plano',
        action: 'edit_plan',
        primary: true
      },
      {
        label: 'Enviar para Aprovação',
        action: 'send_approval',
        primary: false,
        requires: 'complete_plan'
      }
    ]
  },
  pending_approval: {
    label: 'Em Aprovação',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Aguardando aprovação do cliente',
    nextStates: ['approved', 'planning'], // pode voltar para planning se rejeitado
    actions: [
      {
        label: 'Abrir Link de Aprovação',
        action: 'open_approval_link',
        primary: true
      },
      {
        label: 'Cancelar Aprovação',
        action: 'cancel_approval',
        primary: false
      }
    ]
  },
  approved: {
    label: 'Aprovado',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800',
    description: 'Plano aprovado, pronto para execução',
    nextStates: ['in_execution'],
    actions: [
      {
        label: 'Iniciar Execução',
        action: 'start_execution',
        primary: true
      }
    ]
  },
  in_execution: {
    label: 'Em Execução',
    icon: Play,
    color: 'bg-purple-100 text-purple-800',
    description: 'Executando as atividades do ciclo',
    nextStates: ['closing'],
    actions: [
      {
        label: 'Ver Progresso',
        action: 'view_progress',
        primary: true
      },
      {
        label: 'Iniciar Fechamento',
        action: 'start_closing',
        primary: false
      }
    ]
  },
  closing: {
    label: 'Fechamento',
    icon: ArrowRight,
    color: 'bg-orange-100 text-orange-800',
    description: 'Coletando resultados e aprendizados',
    nextStates: ['completed'],
    actions: [
      {
        label: 'Coletar Resultados',
        action: 'collect_results',
        primary: true
      },
      {
        label: 'Finalizar Ciclo',
        action: 'complete_cycle',
        primary: false
      }
    ]
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle2,
    color: 'bg-slate-100 text-slate-800',
    description: 'Ciclo finalizado com sucesso',
    nextStates: [],
    actions: [
      {
        label: 'Ver Relatório',
        action: 'view_report',
        primary: true
      }
    ]
  }
};

export const executeStatusAction = async (cycle, actionType, updateCycle) => {
  try {
    switch (actionType) {
      case 'edit_plan':
        window.location.href = createPageUrl(`cycle-plan/${cycle.id}`);
        break;
        
      case 'send_approval':
        // Verificar se o plano está completo
        if (!cycle.planData?.prioridades?.length) {
          toast.error("Complete o plano antes de enviar para aprovação");
          return;
        }
        
        // Atualizar status para pending_approval
        await updateCycle(cycle.id, { status: 'pending_approval' });
        toast.success("Ciclo enviado para aprovação");
        break;
        
      case 'open_approval_link':
        if (cycle.approvalData?.public_share_token) {
          window.open(createPageUrl(`cycle-approval/${cycle.approvalData.public_share_token}`), '_blank');
        } else {
          toast.error("Link de aprovação não encontrado");
        }
        break;
        
      case 'cancel_approval':
        await updateCycle(cycle.id, { status: 'planning' });
        toast.success("Aprovação cancelada, ciclo retornou para planejamento");
        break;
        
      case 'start_execution':
        await updateCycle(cycle.id, { status: 'in_execution' });
        toast.success("Execução do ciclo iniciada");
        break;
        
      case 'view_progress':
        window.location.href = createPageUrl(`cycle-plan/${cycle.id}?tab=execution`);
        break;
        
      case 'start_closing':
        await updateCycle(cycle.id, { status: 'closing' });
        toast.success("Iniciado processo de fechamento do ciclo");
        break;
        
      case 'collect_results':
        window.location.href = createPageUrl(`cycle-closing/${cycle.id}`);
        break;
        
      case 'complete_cycle':
        await updateCycle(cycle.id, { status: 'completed' });
        toast.success("Ciclo finalizado com sucesso!");
        break;
        
      case 'view_report':
        window.location.href = createPageUrl(`cycle-report/${cycle.id}`);
        break;
        
      default:
        toast.info(`Ação "${actionType}" será implementada em breve`);
    }
  } catch (error) {
    console.error("Erro ao executar ação do ciclo:", error);
    toast.error("Falha ao executar ação. Tente novamente.");
  }
};

export const CycleStatusCard = ({ cycle, onStatusChange }) => {
  const currentStatus = CYCLE_STATUS_FLOW[cycle.status] || CYCLE_STATUS_FLOW.planning;
  const Icon = currentStatus.icon;
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          Status do Ciclo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Badge className={currentStatus.color}>
              {currentStatus.label}
            </Badge>
            <p className="text-sm text-slate-600 mt-1">
              {currentStatus.description}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {currentStatus.actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.primary ? "default" : "outline"}
              size="sm"
              onClick={() => executeStatusAction(cycle, action.action, onStatusChange)}
            >
              {action.label}
              {action.action === 'open_approval_link' && (
                <ExternalLink className="w-3 h-3 ml-1" />
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CycleStatusCard;
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Calendar,
  DollarSign,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const statusConfig = {
  definindo_escopo: {
    label: 'Definindo Escopo',
    color: 'bg-slate-100 text-slate-700',
    icon: FileText
  },
  rc_pendente: {
    label: 'Aguardando Aprovação',
    color: 'bg-amber-100 text-amber-700',
    icon: Clock
  },
  aprovado: {
    label: 'Aprovado',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2
  },
  em_execucao: {
    label: 'Em Execução',
    color: 'bg-blue-100 text-blue-700',
    icon: Play
  },
  concluido: {
    label: 'Concluído',
    color: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700',
    icon: AlertCircle
  }
};

const categoryLabels = {
  landing_page: 'Landing Page',
  rebranding: 'Rebranding',
  evento: 'Evento',
  campanha_unica: 'Campanha Única',
  desenvolvimento: 'Desenvolvimento',
  consultoria: 'Consultoria',
  outro: 'Outro'
};

export default function WorkOrderCard({ workOrder, clientName, onOpen }) {
  const statusInfo = statusConfig[workOrder.status];
  const StatusIcon = statusInfo.icon;
  
  const timeline = workOrder.scope?.timeline;
  const hasDeadline = timeline?.entrega_planejada;
  const isOverdue = hasDeadline && 
    new Date() > new Date(timeline.entrega_planejada) && 
    !['concluido', 'cancelado'].includes(workOrder.status);

  const daysRemaining = hasDeadline ? 
    differenceInDays(new Date(timeline.entrega_planejada), new Date()) : null;

  return (
    <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => onOpen(workOrder)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-900 mb-1">{workOrder.title}</h3>
            <p className="text-sm text-slate-500">{clientName}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={statusInfo.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            {categoryLabels[workOrder.category]}
          </Badge>
          {hasDeadline && (
            <Badge variant="outline" className={`text-xs ${isOverdue ? 'border-red-300 text-red-700' : ''}`}>
              <Calendar className="w-3 h-3 mr-1" />
              {isOverdue ? 'Atrasado' : daysRemaining > 0 ? `${daysRemaining}d restantes` : 'Entrega hoje'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {workOrder.scope?.objetivo && (
            <p className="text-sm text-slate-600 line-clamp-2">
              {workOrder.scope.objetivo}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {workOrder.scope?.investimento?.valor_fixo && (
                <span className="flex items-center gap-1 text-slate-600">
                  <DollarSign className="w-3 h-3" />
                  R$ {workOrder.scope.investimento.valor_fixo.toLocaleString()}
                </span>
              )}
              {timeline?.inicio_planejado && (
                <span className="text-slate-500">
                  Início: {format(new Date(timeline.inicio_planejado), 'dd/MM', { locale: ptBR })}
                </span>
              )}
            </div>
            
            <Button size="sm" variant="outline" onClick={(e) => {
              e.stopPropagation();
              onOpen(workOrder);
            }}>
              <ExternalLink className="w-3 h-3 mr-1" />
              Abrir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
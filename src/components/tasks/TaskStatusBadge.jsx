import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, Play, Pause, Eye, CheckCircle, 
  AlertTriangle, XCircle, Clock, Shield,
  GitBranch, Target, Users
} from 'lucide-react';

const TASK_STATUS_CONFIGS = {
  backlog: {
    label: 'Backlog',
    icon: Circle,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'Aguardando priorização'
  },
  todo: {
    label: 'A Fazer',
    icon: Circle,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Pronta para início'
  },
  in_progress: {
    label: 'Em Progresso',
    icon: Play,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Sendo executada'
  },
  in_review: {
    label: 'Em Revisão',
    icon: Eye,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Aguardando revisão (tarefa)'
  },
  completed: {
    label: 'Concluída',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Tarefa finalizada'
  },
  blocked: {
    label: 'Bloqueada',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Com impedimentos'
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'Não será executada'
  }
};

const DELIVERABLE_STATUS_CONFIGS = {
  not_started: {
    label: 'Não Iniciada',
    icon: Pause,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'Aguardando início (fase)'
  },
  in_progress: {
    label: 'Em Progresso',
    icon: GitBranch,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Fase sendo executada'
  },
  ready_for_review: {
    label: 'Pronta para Revisão',
    icon: Target,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Aguardando revisão (fase)'
  },
  ready_for_approval: {
    label: 'Aguardando Aprovação',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Enviada para aprovação'
  },
  approved: {
    label: 'Aprovado',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Aprovado pelo cliente'
  },
  rejected: {
    label: 'Rejeitado',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Rejeitado - requer correção'
  },
  completed: {
    label: 'Concluída',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Fase finalizada'
  }
};

export function TaskStatusBadge({ status, type = 'task', size = 'default', showIcon = true, className = '' }) {
  const configs = type === 'deliverable' ? DELIVERABLE_STATUS_CONFIGS : TASK_STATUS_CONFIGS;
  const config = configs[status] || configs.todo;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${sizeClasses[size]} ${className} flex items-center gap-1 font-medium`}
      title={config.description}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority, size = 'default', className = '' }) {
  const PRIORITY_CONFIGS = {
    low: {
      label: 'Baixa',
      color: 'bg-gray-100 text-gray-700 border-gray-300'
    },
    medium: {
      label: 'Média',
      color: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    high: {
      label: 'Alta',
      color: 'bg-orange-100 text-orange-800 border-orange-300'
    },
    urgent: {
      label: 'Urgente',
      color: 'bg-red-100 text-red-800 border-red-300'
    }
  };

  const config = PRIORITY_CONFIGS[priority] || PRIORITY_CONFIGS.medium;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${sizeClasses[size]} ${className} font-medium`}
    >
      {config.label}
    </Badge>
  );
}

export function TaskTypeBadge({ type, size = 'default', className = '' }) {
  const TYPE_CONFIGS = {
    analise_documentos: { label: 'Análise Doc.', color: 'bg-blue-50 text-blue-700' },
    coleta_dados: { label: 'Coleta Dados', color: 'bg-green-50 text-green-700' },
    analise_dados: { label: 'Análise Dados', color: 'bg-purple-50 text-purple-700' },
    analise_financeira: { label: 'Análise Financ.', color: 'bg-emerald-50 text-emerald-700' },
    relatorio_financeiro: { label: 'Relatório Financ.', color: 'bg-teal-50 text-teal-700' },
    reuniao_alinhamento: { label: 'Reunião', color: 'bg-orange-50 text-orange-700' },
    planejamento_estrategico: { label: 'Planejamento', color: 'bg-indigo-50 text-indigo-700' },
    implementacao: { label: 'Implementação', color: 'bg-red-50 text-red-700' },
    treinamento: { label: 'Treinamento', color: 'bg-yellow-50 text-yellow-700' },
    administrativo: { label: 'Admin.', color: 'bg-gray-50 text-gray-700' },
    auditoria: { label: 'Auditoria', color: 'bg-pink-50 text-pink-700' },
    consultoria: { label: 'Consultoria', color: 'bg-cyan-50 text-cyan-700' }
  };

  const config = TYPE_CONFIGS[type] || TYPE_CONFIGS.administrativo;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${sizeClasses[size]} ${className} font-medium border-current`}
    >
      {config.label}
    </Badge>
  );
}

// Export default como TaskStatusBadge
export default TaskStatusBadge;

export { TASK_STATUS_CONFIGS, DELIVERABLE_STATUS_CONFIGS };
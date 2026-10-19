import { Badge } from '@/components/ui/badge';
import {
  Pause, Eye, CheckCircle, AlertTriangle, Clock, Target, GitBranch,
} from 'lucide-react';
import { getStagePastel } from '@/lib/modulePastels';
import { getTaskStatusConfig } from '@/lib/taskStatusCanonical';
import { resolveTaskStatusIcon } from '@/lib/taskStatusIcons';
import { shouldShowPriorityBadge } from '@/lib/taskPriority';

const DELIVERABLE_STATUS_CONFIGS = {
  not_started: {
    label: 'Não iniciado',
    icon: Pause,
    color: getStagePastel('not_started').badge,
    description: 'Aguardando início (fase)',
  },
  in_progress: {
    label: 'Em andamento',
    icon: GitBranch,
    color: getStagePastel('in_progress').badge,
    description: 'Fase sendo executada',
  },
  ready_for_review: {
    label: 'Pronto para revisão',
    icon: Target,
    color: getStagePastel('in_review').badge,
    description: 'Aguardando revisão (fase)',
  },
  ready_for_approval: {
    label: 'Aguardando aprovação',
    icon: Clock,
    color: getStagePastel('waiting_client').badge,
    description: 'Enviada para aprovação',
  },
  approved: {
    label: 'Aprovado',
    icon: CheckCircle,
    color: getStagePastel('completed').badge,
    description: 'Aprovado pelo cliente',
  },
  rejected: {
    label: 'Rejeitado',
    icon: AlertTriangle,
    color: getStagePastel('blocked').badge,
    description: 'Rejeitado - requer correção',
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle,
    color: getStagePastel('completed').badge,
    description: 'Fase finalizada',
  },
  in_review: {
    label: 'Em revisão',
    icon: Eye,
    color: getStagePastel('in_review').badge,
    description: 'Em revisão (fase)',
  },
};

export function TaskStatusBadge({ status, type = 'task', size = 'default', showIcon = true, className = '' }) {
  let config;
  let Icon;

  if (type === 'deliverable') {
    config = DELIVERABLE_STATUS_CONFIGS[status] || DELIVERABLE_STATUS_CONFIGS.not_started;
    Icon = config.icon;
  } else {
    const resolved = getTaskStatusConfig(status);
    config = {
      label: resolved.label,
      color: resolved.badge,
      description: resolved.description,
    };
    Icon = resolveTaskStatusIcon(resolved.icon);
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${sizeClasses[size]} ${className} flex items-center gap-1 font-medium rounded-full`}
      title={config.description}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority, size = 'default', className = '' }) {
  if (!shouldShowPriorityBadge(priority)) return null;

  const PRIORITY_CONFIGS = {
    low: {
      label: 'Baixa',
      color: getStagePastel('backlog').badge,
    },
    medium: {
      label: 'Média',
      color: getStagePastel('todo').badge,
    },
    high: {
      label: 'Alta',
      color: getStagePastel('in_progress').badge,
    },
    urgent: {
      label: 'Urgente',
      color: getStagePastel('blocked').badge,
    },
  };

  const config = PRIORITY_CONFIGS[priority] || PRIORITY_CONFIGS.medium;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${sizeClasses[size]} ${className} font-medium rounded-full`}
    >
      {config.label}
    </Badge>
  );
}

export function TaskTypeBadge({ type, size = 'default', className = '' }) {
  const TYPE_CONFIGS = {
    analise_documentos: { label: 'Análise Doc.', color: getStagePastel('todo').badge },
    coleta_dados: { label: 'Coleta Dados', color: getStagePastel('completed').badge },
    analise_dados: { label: 'Análise Dados', color: getStagePastel('in_review').badge },
    analise_financeira: { label: 'Análise Financ.', color: 'bg-[#E6F7F0] text-[#085041] border-[#A8E0CB]' },
    relatorio_financeiro: { label: 'Relatório Financ.', color: 'bg-[#D0F7EC] text-[#085041] border-[#A8E0CB]' },
    reuniao_alinhamento: { label: 'Reunião', color: getStagePastel('in_progress').badge },
    planejamento_estrategico: { label: 'Planejamento', color: 'bg-[#EDE9FB] text-[#4A2FA3] border-[#D4CBF5]' },
    implementacao: { label: 'Implementação', color: getStagePastel('blocked').badge },
    treinamento: { label: 'Treinamento', color: 'bg-[#FFF8E6] text-[#7A5A10] border-[#F0DC9A]' },
    administrativo: { label: 'Admin.', color: getStagePastel('cancelled').badge },
    auditoria: { label: 'Auditoria', color: 'bg-[#FDEBEC] text-[#8A2A3A] border-[#F0B8BC]' },
    consultoria: { label: 'Consultoria', color: getStagePastel('todo').badge },
  };

  const config = TYPE_CONFIGS[type] || TYPE_CONFIGS.administrativo;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${sizeClasses[size]} ${className} font-medium rounded-full`}
    >
      {config.label}
    </Badge>
  );
}

export default TaskStatusBadge;

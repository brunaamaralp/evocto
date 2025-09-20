import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, Play, Pause, Eye, CheckCircle, AlertTriangle, XCircle, 
  Clock, Shield, GitBranch, Target, Users, FileText, Archive,
  ExternalLink, RefreshCw, AlertCircle, Hourglass, CheckCircle2,
  PauseCircle, StopCircle, Timer, Zap
} from 'lucide-react';

// ====== SERVICE STATUS CONFIGS ======
const SERVICE_STATUS_CONFIGS = {
  draft: {
    label: 'Rascunho',
    icon: FileText,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'Serviço em preparação'
  },
  active: {
    label: 'Ativo',
    icon: Play,
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Serviço em execução'
  },
  paused: {
    label: 'Pausado',
    icon: PauseCircle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Pausado operacionalmente (tasks bloqueadas)'
  },
  on_hold: {
    label: 'Em Espera',
    icon: Pause,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Pausado administrativamente'
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Serviço finalizado com sucesso'
  },
  cancelled: {
    label: 'Cancelado',
    icon: StopCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Serviço cancelado'
  },
  archived: {
    label: 'Arquivado',
    icon: Archive,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    description: 'Serviço arquivado'
  }
};

// ====== DELIVERABLE STATUS CONFIGS ======
const DELIVERABLE_STATUS_CONFIGS = {
  not_started: {
    label: 'Não Iniciada',
    icon: Circle,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'Fase aguardando início'
  },
  in_progress: {
    label: 'Em Progresso',
    icon: GitBranch,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Fase sendo executada'
  },
  ready_for_review: {
    label: 'Pronta para Revisão',
    icon: Eye,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Aguardando revisão interna'
  },
  ready_for_approval: {
    label: 'Aguardando Aprovação',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Enviada para aprovação do cliente'
  },
  approved: {
    label: 'Aprovada',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Aprovada pelo cliente'
  },
  rejected: {
    label: 'Rejeitada',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Rejeitada - requer correção'
  },
  completed: {
    label: 'Concluída',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Fase finalizada'
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'Fase cancelada'
  }
};

// ====== TASK STATUS CONFIGS ======
const TASK_STATUS_CONFIGS = {
  todo: {
    label: 'A Fazer',
    icon: Circle,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Tarefa pronta para início'
  },
  in_progress: {
    label: 'Em Progresso',
    icon: Play,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Tarefa sendo executada'
  },
  blocked: {
    label: 'Bloqueada',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Tarefa com impedimentos'
  },
  in_review: {
    label: 'Em Revisão',
    icon: Eye,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Aguardando revisão'
  },
  completed: {
    label: 'Concluída',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Tarefa finalizada'
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'Tarefa cancelada'
  }
};

// ====== PRIORITY CONFIGS ======
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
  },
  critical: {
    label: 'Crítica',
    color: 'bg-red-200 text-red-900 border-red-400'
  }
};

/**
 * Badge universal para status de entidades
 */
export function StatusBadge({ 
  status, 
  type = 'service', 
  size = 'default', 
  showIcon = true, 
  className = '',
  overdue = false,
  blocked = false,
  hasApproval = false,
  slaExpired = false 
}) {
  let configs;
  
  switch (type) {
    case 'service':
      configs = SERVICE_STATUS_CONFIGS;
      break;
    case 'deliverable':
      configs = DELIVERABLE_STATUS_CONFIGS;
      break;
    case 'task':
      configs = TASK_STATUS_CONFIGS;
      break;
    default:
      configs = SERVICE_STATUS_CONFIGS;
  }

  let config = configs[status] || configs.draft || configs.todo || configs.not_started;
  
  // Sobrescrever config para situações especiais
  if (slaExpired || overdue) {
    config = {
      ...config,
      label: `${config.label} (Vencido)`,
      icon: Timer,
      color: 'bg-red-200 text-red-900 border-red-400'
    };
  } else if (blocked && type === 'task') {
    config = {
      ...config,
      label: 'Bloqueada',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-800 border-red-300'
    };
  } else if (hasApproval && ['ready_for_approval', 'pending'].includes(status)) {
    config = {
      ...config,
      icon: Hourglass,
      color: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  }

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

/**
 * Badge para prioridade
 */
export function PriorityBadge({ priority, size = 'default', className = '' }) {
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

/**
 * Badge combinado que mostra status + indicadores especiais
 */
export function StatusIndicator({ 
  entity, 
  type, 
  size = 'default',
  showOverdue = true,
  showBlocked = true,
  showApproval = true,
  className = '' 
}) {
  const status = entity.status || entity.service_status;
  const overdue = showOverdue && (entity.overdue || isEntityOverdue(entity, type));
  const blocked = showBlocked && (entity.blocked || entity.has_blockers || hasBlockedTasks(entity));
  const hasApproval = showApproval && hasActivePendingApproval(entity);
  const slaExpired = entity.sla_expires_at && new Date(entity.sla_expires_at) < new Date();

  const indicators = [];

  // Badge principal de status
  indicators.push(
    <StatusBadge
      key="status"
      status={status}
      type={type}
      size={size}
      overdue={overdue}
      blocked={blocked}
      hasApproval={hasApproval}
      slaExpired={slaExpired}
      className={className}
    />
  );

  // Indicadores adicionais
  if (blocked && status !== 'blocked') {
    indicators.push(
      <Badge key="blocked" variant="outline" className="bg-red-50 text-red-700 border-red-200" size={size}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        Bloqueios
      </Badge>
    );
  }

  if (overdue && !slaExpired) {
    indicators.push(
      <Badge key="overdue" variant="outline" className="bg-orange-50 text-orange-700 border-orange-200" size={size}>
        <Clock className="w-3 h-3 mr-1" />
        Atrasado
      </Badge>
    );
  }

  if (hasApproval) {
    indicators.push(
      <Badge key="approval" variant="outline" className="bg-purple-50 text-purple-700 border-purple-200" size={size}>
        <ExternalLink className="w-3 h-3 mr-1" />
        Aprovação
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {indicators}
    </div>
  );
}

// ====== HELPER FUNCTIONS ======

function isEntityOverdue(entity, type) {
  const now = new Date();
  
  switch (type) {
    case 'service':
      return entity.end_date && new Date(entity.end_date) < now && 
             !['completed', 'cancelled', 'archived'].includes(entity.service_status);
             
    case 'deliverable':
      return entity.sla_expires_at && new Date(entity.sla_expires_at) < now &&
             !['completed', 'cancelled', 'approved'].includes(entity.status);
             
    case 'task':
      return entity.dueDate && new Date(entity.dueDate) < now &&
             !['completed', 'cancelled'].includes(entity.status);
             
    default:
      return false;
  }
}

function hasBlockedTasks(entity) {
  if (entity.deliverables) {
    return entity.deliverables.some(d => d.has_blockers);
  }
  return entity.has_blockers || false;
}

function hasActivePendingApproval(entity) {
  return entity.status === 'ready_for_approval' || 
         (entity.deliverables && entity.deliverables.some(d => d.status === 'ready_for_approval'));
}

export default StatusBadge;

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutTemplate, FileText, Users, Settings, 
  CheckCircle, Clock, AlertTriangle, XCircle 
} from 'lucide-react';

const SERVICE_TYPE_CONFIG = {
  template: {
    icon: LayoutTemplate,
    label: 'Template',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Modelo reutilizável'
  },
  instance: {
    icon: FileText,
    label: 'Instância',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Serviço para cliente'
  }
};

const STATUS_CONFIG = {
  draft: {
    icon: Settings,
    label: 'Rascunho',
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  active: {
    icon: CheckCircle,
    label: 'Ativo',
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  on_hold: {
    icon: Clock,
    label: 'Em Pausa',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  completed: {
    icon: CheckCircle,
    label: 'Concluído',
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700 border-red-200'
  }
};

const TEMPLATE_CATEGORY_CONFIG = {
  standard: {
    label: 'Padrão',
    color: 'bg-blue-50 text-blue-600'
  },
  premium: {
    label: 'Premium',
    color: 'bg-purple-50 text-purple-600'
  },
  custom: {
    label: 'Customizado',
    color: 'bg-green-50 text-green-600'
  },
  deprecated: {
    label: 'Descontinuado',
    color: 'bg-gray-50 text-gray-500'
  }
};

export default function ServiceTypeIndicator({ service, showStatus = true, size = 'default' }) {
  const isTemplate = service?.is_template;
  const serviceType = isTemplate ? 'template' : 'instance';
  const typeConfig = SERVICE_TYPE_CONFIG[serviceType];
  const TypeIcon = typeConfig.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Tipo do Serviço */}
      <Badge 
        variant="outline" 
        className={`${typeConfig.color} ${sizeClasses[size]} flex items-center gap-1.5 font-medium`}
      >
        <TypeIcon className="w-3 h-3" />
        {typeConfig.label}
      </Badge>

      {/* Categoria do Template */}
      {isTemplate && service?.template_category && (
        <Badge 
          variant="secondary"
          className={`${TEMPLATE_CATEGORY_CONFIG[service.template_category]?.color || 'bg-gray-50 text-gray-600'} ${sizeClasses[size]}`}
        >
          {TEMPLATE_CATEGORY_CONFIG[service.template_category]?.label || service.template_category}
        </Badge>
      )}

      {/* Status do Serviço (apenas para instâncias) */}
      {!isTemplate && showStatus && service?.service_status && (
        <Badge 
          variant="outline"
          className={`${STATUS_CONFIG[service.service_status]?.color || 'bg-gray-100 text-gray-700'} ${sizeClasses[size]} flex items-center gap-1.5`}
        >
          {STATUS_CONFIG[service.service_status]?.icon && 
            React.createElement(STATUS_CONFIG[service.service_status].icon, { className: "w-3 h-3" })
          }
          {STATUS_CONFIG[service.service_status]?.label || service.service_status}
        </Badge>
      )}

      {/* Indicador de Customização (para instâncias customizadas) */}
      {!isTemplate && service?.customizations && Object.keys(service.customizations).length > 0 && (
        <Badge variant="outline" className={`bg-orange-50 text-orange-600 border-orange-200 ${sizeClasses[size]} flex items-center gap-1.5`}>
          <Settings className="w-3 h-3" />
          Customizado
        </Badge>
      )}

      {/* Contador de Uso (para templates) */}
      {isTemplate && service?.template_metadata?.usage_count > 0 && (
        <Badge variant="secondary" className={`bg-gray-50 text-gray-600 ${sizeClasses[size]} flex items-center gap-1.5`}>
          <Users className="w-3 h-3" />
          {service.template_metadata.usage_count} uso{service.template_metadata.usage_count !== 1 ? 's' : ''}
        </Badge>
      )}

      {/* Alerta de Problemas de Consistência */}
      {((isTemplate && (service?.clientId || service?.start_date)) ||
        (!isTemplate && (!service?.clientId || !service?.base_service_id))) && (
        <Badge variant="destructive" className={`${sizeClasses[size]} flex items-center gap-1.5`}>
          <AlertTriangle className="w-3 h-3" />
          Inconsistente
        </Badge>
      )}
    </div>
  );
}

export { SERVICE_TYPE_CONFIG, STATUS_CONFIG, TEMPLATE_CATEGORY_CONFIG };

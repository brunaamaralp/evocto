
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  Bell,
  Calendar,
  FileText,
  TrendingDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

const severityConfig = {
  low: {
    color: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    badgeColor: 'bg-blue-100 text-blue-800',
    icon: CheckCircle
  },
  medium: {
    color: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-800',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  high: {
    color: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-800',
    badgeColor: 'bg-orange-100 text-orange-800',
    icon: AlertTriangle
  },
  critical: {
    color: 'bg-red-50 border-red-200',
    textColor: 'text-red-800',
    badgeColor: 'bg-red-100 text-red-800',
    icon: AlertCircle
  }
};

const riskTypeConfig = {
  approval_expiring: {
    label: 'Aprovação Expirando',
    icon: Clock,
    description: 'Link de aprovação próximo do vencimento'
  },
  cycle_overdue: {
    label: 'Ciclo Atrasado',
    icon: Calendar,
    description: 'Ciclo com execução em atraso'
  },
  learning_untriaged: {
    label: 'Aprendizado Não Revisado',
    icon: FileText,
    description: 'Aprendizados aguardando triagem há muito tempo'
  },
  briefing_stale: {
    label: 'Briefing Desatualizado',
    icon: TrendingDown,
    description: 'Briefing sem atualizações recentes'
  },
  kpi_deviation: {
    label: 'KPI Fora do Target',
    icon: TrendingDown,
    description: 'Métricas importantes abaixo do esperado'
  }
};

export default function AgentAlert({ risk, onDismiss, onAction }) {
  const severity = severityConfig[risk.severity] || severityConfig.medium;
  const riskType = riskTypeConfig[risk.type] || riskTypeConfig.cycle_overdue;
  const SeverityIcon = severity.icon;
  const RiskIcon = riskType.icon;

  const handlePrimaryAction = () => {
    if (risk.entity && risk.entity.type && risk.entity.id) {
      // Gerar URL baseada no tipo de entidade
      let url = '/today'; // fallback
      
      switch (risk.entity.type) {
        case 'CyclePlan':
          url = createPageUrl(`cycle-plan/${risk.entity.id}`);
          break;
        case 'Client':
          url = createPageUrl(`clients/${risk.entity.id}`);
          break;
        case 'Service':
          url = createPageUrl(`services/${risk.entity.id}`);
          break;
        case 'LearningEntry':
          url = createPageUrl('library');
          break;
        case 'BriefingVersion':
          // Supondo que o editor de briefing aceite o ID da versão
          url = createPageUrl(`briefing-editor?id=${risk.entity.id}`);
          break;
      }
      
      // Abre em nova aba para não interromper o fluxo do dashboard
      window.open(url, '_blank');
    }
    
    if (onAction) {
      onAction(risk, 'primary');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Alert className={`${severity.color} border-l-4`}>
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <RiskIcon className={`h-4 w-4 ${severity.textColor}`} />
            <SeverityIcon className={`h-3 w-3 ${severity.textColor}`} />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className={`font-semibold text-sm ${severity.textColor}`}>
                  {risk.title}
                </h4>
                <AlertDescription className={`text-xs ${severity.textColor} opacity-90`}>
                  {risk.description}
                </AlertDescription>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`${severity.badgeColor} text-xs`}>
                  {risk.severity.toUpperCase()}
                </Badge>
                {risk.detected_at && (
                  <span className={`text-xs ${severity.textColor} opacity-75`}>
                    {formatDistanceToNow(new Date(risk.detected_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Entity Information */}
            {risk.entity && (
              <div className={`text-xs ${severity.textColor} opacity-80 bg-white/50 rounded px-2 py-1`}>
                <strong>{risk.entity.type}:</strong> {risk.entity.name}
              </div>
            )}

            {/* Suggested Actions */}
            {risk.suggested_actions && risk.suggested_actions.length > 0 && (
              <div className="space-y-1">
                <p className={`text-xs font-medium ${severity.textColor}`}>Ações sugeridas:</p>
                <ul className={`text-xs ${severity.textColor} opacity-90 space-y-0.5`}>
                  {risk.suggested_actions.slice(0, 2).map((action, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-current rounded-full shrink-0"></span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrimaryAction}
                className={`text-xs h-7 border-current ${severity.textColor} hover:bg-white/50`}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir
              </Button>
              
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(risk)}
                  className={`text-xs h-7 ${severity.textColor} hover:bg-white/50`}
                >
                  Dispensar
                </Button>
              )}
            </div>
          </div>
        </div>
      </Alert>
    </motion.div>
  );
}


import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Placeholder for createPageUrl, assuming it's defined elsewhere in a real application
// or imported from a utility file. For this component to be standalone and functional,
// we'll define a basic version.
const createPageUrl = (pageName) => {
  switch (pageName) {
    case 'client': return '/app/clients';
    case 'service-detail': return '/app/services';
    case 'client-tasks': return '/app/tasks';
    case 'client-briefing': return '/app/briefings';
    case 'approval-dashboard': return '/app/approvals';
    case 'dashboard':
    default: return '/app/dashboard';
  }
};

const riskConfig = {
  critical: { badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Crítico' },
  high: { badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Alto' },
  medium: { badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Médio' },
  low: { badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30', label: 'Baixo' },
  sugestão: { badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'Sugestão' }
};

export default function ActionableItemCard({ item }) {
  const { title, badgeText, description } = item;
  
  const riskLevel = badgeText?.toLowerCase() || 'low';
  const Icon = item.icon;
  const iconColor = item.iconColor;
  const riskInfo = riskConfig[riskLevel] || riskConfig.low;

  const getItemUrl = () => {
    switch (item.type) {
      case 'client':
        return createPageUrl('client') + `?clientId=${item.entityId}`;
      case 'service':
        return createPageUrl('service-detail') + `?serviceId=${item.entityId}`;
      case 'task':
        return createPageUrl('client-tasks') + `?taskId=${item.entityId}`;
      case 'briefing':
        return createPageUrl('client-briefing') + `?clientId=${item.metadata?.clientId}`;
      case 'approval':
        return createPageUrl('approval-dashboard') + `?approvalId=${item.entityId}`;
      default:
        return createPageUrl('dashboard');
    }
  };

  return (
    <TooltipProvider>
      <Link to={getItemUrl()} className="block group h-full">
        <div className="card relative h-full flex flex-col transition-all duration-200 hover:border-white/30">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className={`flex-shrink-0 mt-1 ${iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate group-hover:text-ev-cyan">
                {title}
              </p>
              <div className="text-xs text-white/70 mt-1 line-clamp-2">
                {description}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-white/20 flex-grow flex items-end justify-between">
            <Badge 
              className={`text-xs capitalize ${riskInfo.badgeClass}`}
            >
              {riskInfo.label}
            </Badge>
            <div className="flex items-center text-xs text-ev-cyan opacity-0 group-hover:opacity-100 transition-opacity">
              Ver mais <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>
      </Link>
    </TooltipProvider>
  );
}

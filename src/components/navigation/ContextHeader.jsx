import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft, ChevronDown, ExternalLink, 
  Eye, MoreVertical, Users, Briefcase, Calendar,
  FileText, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/shared/StatusBadge';

const ContextHeader = ({ 
  title, 
  subtitle, 
  backButton, 
  entity, 
  actions = [], 
  quickActions = [],
  relatedPages = []
}) => {
  const getEntityIcon = (type) => {
    const icons = {
      client: Users,
      service: Briefcase,
      cycle: Calendar,
      briefing: FileText,
      project: TrendingUp
    };
    return icons[type] || Eye;
  };

  const EntityIcon = entity?.type ? getEntityIcon(entity.type) : null;

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 space-y-4">
      {/* Primeira linha - Navegação e título */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {backButton && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hover:bg-slate-100 shrink-0"
            >
              {backButton.href ? (
                <Link to={backButton.href} aria-label="Voltar">
                  <ChevronLeft className="w-5 h-5" />
                </Link>
              ) : (
                <button type="button" onClick={backButton.action} aria-label="Voltar">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </Button>
          )}

          <div className="flex items-center gap-3 min-w-0">
            {EntityIcon && (
              <div className="hidden sm:flex w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg items-center justify-center shrink-0">
                <EntityIcon className="w-5 h-5 text-blue-600" />
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-600 truncate">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ações principais */}
        {actions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                size="sm"
                onClick={action.onClick}
                className={`w-full sm:w-auto ${action.className || ''}`}
              >
                {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Segunda linha - Contexto da entidade e navegação rápida */}
      {(entity || relatedPages.length > 0 || quickActions.length > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {entity && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
              {entity.status && (
                <StatusBadge status={entity.status} size="sm" />
              )}
              
              {entity.metadata && entity.metadata.map((meta, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
                  {meta.icon && <meta.icon className="w-4 h-4 shrink-0" />}
                  <span className="truncate">
                    {meta.label}: <span className="font-medium">{meta.value}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {relatedPages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Navegar para
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {relatedPages.map((page, index) => (
                    <DropdownMenuItem key={index} asChild>
                      <Link to={page.href} className="flex items-center gap-2">
                        {page.icon && <page.icon className="w-4 h-4" />}
                        {page.label}
                        {page.external && <ExternalLink className="w-3 h-3 ml-auto" />}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {quickActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Mais ações">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {quickActions.map((action, index) => (
                    <React.Fragment key={index}>
                      <DropdownMenuItem onClick={action.onClick}>
                        {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                        {action.label}
                      </DropdownMenuItem>
                      {action.separator && <DropdownMenuSeparator />}
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextHeader;

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft, ChevronDown, ExternalLink, Settings, 
  Eye, MoreVertical, Users, Briefcase, Calendar,
  FileText, TrendingUp, MessageCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
    <div className="bg-white border-b border-slate-200 px-6 py-4 space-y-4">
      {/* Primeira linha - Navegação e título */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Botão voltar */}
          {backButton && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hover:bg-slate-100"
            >
              {backButton.href ? (
                <Link to={backButton.href}>
                  <ChevronLeft className="w-5 h-5" />
                </Link>
              ) : (
                <button onClick={backButton.action}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </Button>
          )}

          <div className="flex items-center gap-3">
            {/* Ícone da entidade */}
            {EntityIcon && (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                <EntityIcon className="w-5 h-5 text-blue-600" />
              </div>
            )}

            <div>
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-600">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ações principais */}
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              size="sm"
              onClick={action.onClick}
              className={action.className}
            >
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Segunda linha - Contexto da entidade e navegação rápida */}
      {(entity || relatedPages.length > 0 || quickActions.length > 0) && (
        <div className="flex items-center justify-between">
          {/* Informações da entidade */}
          {entity && (
            <div className="flex items-center gap-4">
              {entity.status && (
                <StatusBadge status={entity.status} size="sm" />
              )}
              
              {entity.metadata && entity.metadata.map((meta, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                  {meta.icon && <meta.icon className="w-4 h-4" />}
                  <span>{meta.label}: <span className="font-medium">{meta.value}</span></span>
                </div>
              ))}
            </div>
          )}

          {/* Navegação rápida e ações */}
          <div className="flex items-center gap-2">
            {/* Páginas relacionadas */}
            {relatedPages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
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

            {/* Ações rápidas */}
            {quickActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
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
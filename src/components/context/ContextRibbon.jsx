
import React, { useEffect } from 'react';
import { useAppContext } from './ContextProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ChevronRight, Building, Settings, ArrowLeft } from 'lucide-react';
import { useRibbon } from '@/components/context/RibbonProvider';
import { safeClearRibbon } from '@/components/utils/compat-ribbon';

export default function ContextRibbon({ clientId, projectId, serviceId }) {
  const { ribbonContext, loading, error } = useAppContext();
  const ribbon = useRibbon();

  // Atualizar ribbon quando contexto muda
  useEffect(() => {
    if (clientId) {
      // Exemplo de uso do novo ribbon
      ribbon.showInfo(`Contexto: Cliente ${clientId}`);
    } else {
      ribbon.clear();
    }
  }, [clientId, ribbon]);

  if (loading || error || !ribbonContext) {
    return null;
  }

  const { client, service, cycle, workOrder, nextAction, links } = ribbonContext;

  return (
    <Card className="mb-6 border-0 shadow-sm bg-slate-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3 text-sm">
          <Building className="w-4 h-4 text-slate-500" />
          
          <Link 
            to={links.client} 
            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
          >
            {client.name}
          </Link>
          
          {service && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <Link 
                to={links.service} 
                className="text-slate-600 hover:text-blue-600 transition-colors"
              >
                {service.name}
              </Link>
            </>
          )}
          
          {cycle && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600">{cycle.label}</span>
              <Badge variant="outline" className="text-xs">
                {cycle.status === 'planning' ? 'Planejamento' : 
                 cycle.status === 'approved' ? 'Aprovado' : 
                 cycle.status === 'in_execution' ? 'Em Execução' : cycle.status}
              </Badge>
            </>
          )}
          
          {workOrder && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600">{workOrder.title}</span>
              <Badge variant="outline" className="text-xs">
                {workOrder.status === 'definindo_escopo' ? 'Escopo' :
                 workOrder.status === 'rc_pendente' ? 'RC Pendente' :
                 workOrder.status === 'aprovado' ? 'Aprovado' :
                 workOrder.status === 'em_execucao' ? 'Em Execução' : workOrder.status}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {nextAction && (
            <Button size="sm" variant="outline" asChild>
              <Link to={cycle ? links.cycle : workOrder ? links.workOrder : links.client}>
                {nextAction}
              </Link>
            </Button>
          )}
          
          <Button size="sm" variant="ghost" asChild>
            <Link to={links.client}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Overview
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, ArrowRight, Plus, Target } from 'lucide-react';
import { createPageUrl } from '@/utils';

function cycleStatusLabel(status) {
  switch (status) {
    case 'in_execution':
      return 'Em execução';
    case 'approved':
      return 'Aprovado';
    default:
      return status || '—';
  }
}

export default function ClientExecutionPanel({
  clientId,
  activeServices = [],
  activeCycles = [],
}) {
  const servicesHref = createPageUrl(`client-services?clientId=${clientId}`);
  const topServices = activeServices.slice(0, 5);
  const cyclesByService = activeCycles.reduce((acc, cycle) => {
    const key = cycle.serviceId || '_none';
    if (!acc[key]) acc[key] = [];
    acc[key].push(cycle);
    return acc;
  }, {});

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Em execução
          </span>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to={servicesHref}>
              Ver serviços
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 text-sm">
          <div className="rounded-lg bg-blue-50 px-3 py-2 flex-1">
            <p className="text-blue-700 text-xs font-medium">Serviços ativos</p>
            <p className="text-xl font-semibold text-blue-900">{activeServices.length}</p>
          </div>
          <div className="rounded-lg bg-green-50 px-3 py-2 flex-1">
            <p className="text-green-700 text-xs font-medium">Ciclos ativos</p>
            <p className="text-xl font-semibold text-green-900">{activeCycles.length}</p>
          </div>
        </div>

        {topServices.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-lg">
            <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">Nenhum serviço em execução</p>
            <Button asChild size="sm">
              <Link to={createPageUrl(`services?action=new&clientId=${clientId}`)}>
                <Plus className="w-4 h-4 mr-1" />
                Criar serviço
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {topServices.map((service) => {
              const serviceCycles = cyclesByService[service.id] || [];
              return (
                <li
                  key={service.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{service.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {serviceCycles.length > 0
                        ? `${serviceCycles.length} ciclo(s) ativo(s)`
                        : 'Sem ciclo ativo'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline">
                      {service.service_status || service.status || 'ativo'}
                    </Badge>
                    {serviceCycles[0] && (
                      <span className="text-[10px] text-green-700">
                        {cycleStatusLabel(serviceCycles[0].status)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {activeCycles.length > 0 && topServices.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-gray-500 mb-2">Ciclos recentes</p>
            <ul className="space-y-1.5">
              {activeCycles.slice(0, 3).map((cycle) => (
                <li key={cycle.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-gray-800">{cycle.title || 'Ciclo'}</span>
                  <Badge variant="secondary" className="ml-2 shrink-0 text-[10px]">
                    {cycleStatusLabel(cycle.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

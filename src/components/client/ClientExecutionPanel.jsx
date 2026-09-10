import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Settings2 } from 'lucide-react';
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

/** Painel secundário: serviços/ciclos como infraestrutura, não foco operacional. */
export default function ClientExecutionPanel({
  clientId,
  activeServices = [],
  activeCycles = [],
}) {
  const servicesHref = createPageUrl(`client-services?clientId=${clientId}`);
  const topServices = activeServices.slice(0, 4);
  const cyclesByService = activeCycles.reduce((acc, cycle) => {
    const key = cycle.serviceId || '_none';
    if (!acc[key]) acc[key] = [];
    acc[key].push(cycle);
    return acc;
  }, {});

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base gap-2">
          <span className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#7A7595]" />
            Serviços e ciclos
          </span>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to={servicesHref}>
              Gerenciar
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </CardTitle>
        <p className="text-xs text-[#7A7595] font-normal">
          Infraestrutura por trás das campanhas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {topServices.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-lg">
            <p className="text-sm text-gray-600">
              Sem serviço vinculado ainda — criado automaticamente ao abrir uma
              campanha.
            </p>
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

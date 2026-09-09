import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Menu, Pencil } from 'lucide-react';
import { createPageUrl } from '@/utils';

const STATUS_LABELS = {
  setup: 'Configuração',
  briefing_pending: 'Aguardando briefing',
  kpis_setup: 'KPIs',
  in_execution: 'Em execução',
  closing: 'Finalizando',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  archived: 'Arquivado',
};

export default function DeliveryWorkspaceHeader({
  service,
  client,
  onOpenNav,
  navOpen = false,
}) {
  if (!service) return null;

  const name = service.name || 'Entrega';
  const status = service.service_status || service.status || '';
  const statusLabel = STATUS_LABELS[status] || status || '—';
  const clientName = client?.name || client?.legal_name || service.clientName || 'Cliente';
  const clientId = service.clientId || client?.id;
  const clientHref = clientId
    ? `${createPageUrl('client')}?clientId=${clientId}`
    : null;
  const editHref = `${createPageUrl('service-instance-editor')}?serviceId=${service.id}`;

  return (
    <header className="delivery-workspace-header">
      <div className="delivery-workspace-header__toolbar">
        {typeof onOpenNav === 'function' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="delivery-workspace-header__nav-toggle md:hidden"
            aria-expanded={navOpen}
            onClick={onOpenNav}
          >
            <Menu className="w-4 h-4 mr-1" />
            Menu
          </Button>
        ) : null}

        <div className="delivery-workspace-header__lead">
          <nav className="delivery-workspace-header__breadcrumb text-sm text-slate-500">
            <Link to={createPageUrl('clients')} className="hover:text-slate-800">
              Clientes
            </Link>
            <span className="mx-1.5">/</span>
            {clientHref ? (
              <Link to={clientHref} className="hover:text-slate-800">
                {clientName}
              </Link>
            ) : (
              <span>{clientName}</span>
            )}
            <span className="mx-1.5">/</span>
            <span className="text-slate-800 font-medium">{name}</span>
          </nav>

          <div className="delivery-workspace-header__identity">
            <h1 className="delivery-workspace-header__name">{name}</h1>
            <div className="delivery-workspace-header__meta">
              <Badge variant="secondary">{statusLabel}</Badge>
              {clientHref ? (
                <Link to={clientHref} className="text-sm text-slate-600 hover:text-slate-900">
                  {clientName}
                </Link>
              ) : (
                <span className="text-sm text-slate-600">{clientName}</span>
              )}
            </div>
          </div>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link to={editHref}>
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Editar
          </Link>
        </Button>
      </div>
    </header>
  );
}

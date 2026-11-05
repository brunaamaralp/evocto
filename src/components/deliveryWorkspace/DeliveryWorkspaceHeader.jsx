import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Menu, Pencil } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { statusLabelPt } from '@/lib/statusLabelsPt';

const SERVICE_STATUS_LABELS = {
  setup: 'Configuração',
  briefing_pending: 'Aguardando briefing',
  kpis_setup: 'KPIs',
  in_execution: 'Em execução',
  closing: 'Finalizando',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  archived: 'Arquivado',
};

function serviceStatusLabel(status) {
  const key = String(status || '').trim().toLowerCase();
  if (!key) return null;
  return SERVICE_STATUS_LABELS[key] || statusLabelPt(key, null);
}

/**
 * Header do /delivery-workspace.
 */
export default function DeliveryWorkspaceHeader({
  service,
  client,
  onOpenNav,
  navOpen = false,
}) {
  if (!service) return null;

  const serviceName = service.name || 'Serviço';
  const title = serviceName;
  const clientName = client?.name || client?.legal_name || service.clientName || 'Cliente';
  const clientId = service.clientId || client?.id;
  const clientHref = clientId
    ? `${createPageUrl('client-detail')}?clientId=${clientId}`
    : null;
  const editHref = `${createPageUrl('service-instance-editor')}?serviceId=${service.id}`;

  const statusRaw = service.service_status || service.status || '';
  const statusLabel = serviceStatusLabel(statusRaw);

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
            <span className="text-slate-800 font-medium">{serviceName}</span>
          </nav>

          <div className="delivery-workspace-header__identity">
            <div className="delivery-workspace-header__title-row">
              <h1 className="delivery-workspace-header__name">{title}</h1>
              <Badge
                className="bg-slate-100 text-slate-700 border-slate-200"
                variant="outline"
              >
                Serviço
              </Badge>
            </div>

            <div className="delivery-workspace-header__meta">
              {statusLabel ? (
                <Badge variant="secondary">{statusLabel}</Badge>
              ) : null}
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

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { ExternalLink } from 'lucide-react';

function formatMoney(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DeliveryWorkspaceFinance({ service }) {
  const contractValue = service?.contract_value ?? service?.contractValue;
  const monthlyValue = service?.monthly_value ?? service?.monthlyValue;
  const financeHref = `${createPageUrl('financeiro')}?serviceId=${service?.id || ''}${
    service?.clientId ? `&clientId=${service.clientId}` : ''
  }`;

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Resumo financeiro da entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-100 p-3">
              <p className="text-xs text-slate-500">Valor do contrato</p>
              <p className="text-lg font-semibold">{formatMoney(contractValue)}</p>
            </div>
            <div className="rounded-md border border-slate-100 p-3">
              <p className="text-xs text-slate-500">Mensalidade / recorrente</p>
              <p className="text-lg font-semibold">{formatMoney(monthlyValue)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Parcelas por etapa (estilo project_charges) entram no P1. Por enquanto, use o hub
            financeiro com o filtro deste serviço.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={financeHref}>
              Abrir financeiro
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

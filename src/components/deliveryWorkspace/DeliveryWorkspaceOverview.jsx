import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ListTodo, Clock, CalendarPlus, Copy, ClipboardCopy, FileText } from 'lucide-react';
import NewMonthCycleWizard from '@/components/cycles/NewMonthCycleWizard';
import DuplicateCycleWizard from '@/components/cycles/DuplicateCycleWizard';
import WorkloadByPersonPanel from '@/components/tasks/WorkloadByPersonPanel';
import { buildDeliveryWeeklyStatusCopy } from '@/lib/deliveryWeeklyStatusCopy';
import {
  collectClientHistoryEntries,
  clientHistoryToMarkdown,
  downloadTextFile,
} from '@/lib/clientHistoryExport';
import {
  openPrintableReport,
  buildClientHistoryPrintDoc,
} from '@/lib/printableReport';
import { toast } from 'sonner';

function deliverableProgress(deliverables = [], tasks = []) {
  if (!deliverables.length) return 0;
  const done = deliverables.filter((d) =>
    ['completed', 'approved'].includes(String(d.status || '').toLowerCase())
  ).length;
  return Math.round((done / deliverables.length) * 100);
}

export default function DeliveryWorkspaceOverview({
  service,
  client,
  tasks = [],
  onGoSection,
  onCycleCreated,
}) {
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);

  const handleCopyWeeklyStatus = async () => {
    const text = buildDeliveryWeeklyStatusCopy({ service, client, tasks });
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Status copiado — cole no WhatsApp ou e-mail');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const handleExportClientHistory = (asPdf = false) => {
    const entries = collectClientHistoryEntries(tasks);
    const clientName = client?.name || service?.clientName || 'Cliente';
    if (asPdf) {
      try {
        openPrintableReport(
          buildClientHistoryPrintDoc({
            client: client || { name: clientName },
            periodLabel: service?.name || 'Histórico do serviço',
            entries,
          })
        );
        toast.success('Histórico aberto — Salvar como PDF');
      } catch (err) {
        toast.error(err?.message || 'Falha ao exportar histórico');
      }
      return;
    }
    const md = clientHistoryToMarkdown(clientName, entries);
    const slug = String(clientName).replace(/\s+/g, '_').toLowerCase();
    downloadTextFile(`historico_${slug}.md`, md, 'text/markdown;charset=utf-8');
    toast.success('Histórico baixado (.md)');
  };

  const deliverables = service?.deliverables || [];
  const progress = useMemo(
    () => deliverableProgress(deliverables, tasks),
    [deliverables, tasks]
  );

  const openTasks = tasks.filter((t) => !['completed', 'cancelled'].includes(t.status)).length;
  const doneTasks = tasks.filter((t) => t.status === 'completed').length;
  const loggedHours = tasks.reduce((sum, t) => sum + (Number(t.actualHours) || 0), 0);
  const estimatedHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowNewCycle(true)}
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Novo ciclo do mês
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowDuplicate(true)}
        >
          <Copy className="w-4 h-4 mr-2" />
          Duplicar ciclo / novo mês
        </Button>
        <Button type="button" size="sm" onClick={handleCopyWeeklyStatus}>
          <ClipboardCopy className="w-4 h-4 mr-2" />
          Copiar status da semana
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleExportClientHistory(false)}
        >
          <FileText className="w-4 h-4 mr-2" />
          Exportar histórico
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleExportClientHistory(true)}
        >
          Histórico PDF
        </Button>
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progresso da entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Etapas concluídas</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-500">
            {deliverables.filter((d) => ['completed', 'approved'].includes(d.status)).length} de{' '}
            {deliverables.length} etapas
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
          onClick={() => onGoSection?.('tasks')}
        >
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <ListTodo className="w-3.5 h-3.5" />
            Tarefas abertas
          </div>
          <div className="text-2xl font-semibold text-slate-900">{openTasks}</div>
          <div className="text-xs text-slate-500">{doneTasks} concluídas</div>
        </button>
        <button
          type="button"
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
          onClick={() => onGoSection?.('atividade')}
        >
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            Horas
          </div>
          <div className="text-2xl font-semibold text-slate-900">
            {loggedHours.toFixed(1)}h
          </div>
          <div className="text-xs text-slate-500">de {estimatedHours.toFixed(1)}h estimadas</div>
        </button>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500 mb-1">Valor / contrato</div>
          <div className="text-2xl font-semibold text-slate-900">
            {service?.contract_value || service?.monthly_value
              ? `R$ ${Number(service.contract_value || service.monthly_value).toLocaleString('pt-BR')}`
              : '—'}
          </div>
          <button
            type="button"
            className="text-xs text-slate-600 underline mt-1"
            onClick={() => onGoSection?.('finance')}
          >
            Ver financeiro
          </button>
        </div>
      </div>

      <WorkloadByPersonPanel tasks={tasks} />

      <Card className="border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Etapas</CardTitle>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma etapa configurada neste serviço.</p>
          ) : (
            <ul className="space-y-2">
              {deliverables.map((d, index) => {
                const done = ['completed', 'approved'].includes(String(d.status || '').toLowerCase());
                const active = String(d.status || '') === 'in_progress';
                const weekLabel =
                  d.description && /semana\s*\d/i.test(d.description)
                    ? `S${(String(d.description).match(/semana\s*(\d)/i) || [])[1] || index + 1}`
                    : `S${index + 1}`;
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-300'}`} />
                      )}
                      <span className="text-[10px] font-semibold text-slate-500 shrink-0">{weekLabel}</span>
                      <span className="text-sm text-slate-800 truncate">{d.name}</span>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {(d.status || 'not_started').replace(/_/g, ' ')}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <NewMonthCycleWizard
        open={showNewCycle}
        onOpenChange={setShowNewCycle}
        defaultClientId={service?.clientId || ''}
        defaultServiceId={service?.id || ''}
        onSuccess={onCycleCreated}
      />
      <DuplicateCycleWizard
        open={showDuplicate}
        onOpenChange={setShowDuplicate}
        serviceId={service?.id}
        onSuccess={onCycleCreated}
      />
    </div>
  );
}

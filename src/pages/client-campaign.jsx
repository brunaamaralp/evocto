import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Clock,
  FileText,
  Loader2,
  Target,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Brief, Client, CyclePlan, Service, Task } from '@/api/entities';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import { buildClientTasksHref, filterTasksByScope } from '@/lib/taskScope';
import { summarizeTasks } from '@/hooks/useClientHubData';

const STATUS_LABELS = {
  READY: 'Pronta',
  APPROVED: 'Aprovada',
  IN_REVIEW: 'Em revisão',
  DRAFT: 'Rascunho',
  ready: 'Pronta',
  approved: 'Aprovada',
  in_review: 'Em revisão',
  draft: 'Rascunho',
  em_execucao: 'Em execução',
  rápido: 'Rápida',
};

function statusLabel(status) {
  if (!status) return '—';
  return STATUS_LABELS[status] || String(status);
}

function taskStatusLabel(status) {
  switch (String(status || '')) {
    case 'completed':
    case 'done':
      return 'Concluída';
    case 'in_progress':
      return 'Em andamento';
    case 'blocked':
      return 'Bloqueada';
    case 'todo':
    case 'pending':
    default:
      return 'Pendente';
  }
}

async function safeGet(entity, id) {
  if (!id) return null;
  try {
    return await entity.get(id);
  } catch {
    return null;
  }
}

async function safeFilter(entity, filters) {
  try {
    const result = await entity.filter(filters);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

/**
 * Contexto unificado da campanha: resumo + progresso + tarefas + atalhos.
 */
export default function ClientCampaignPage() {
  const { agencyId, isAuthenticated } = useSession();
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const clientId = getUrlSearchParam(urlParams, 'clientId', 'id');
  const briefingId = getUrlSearchParam(urlParams, 'briefingId', 'campaignId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [service, setService] = useState(null);
  const [scopedTasks, setScopedTasks] = useState([]);
  const [taskScope, setTaskScope] = useState('none');

  const load = useCallback(async () => {
    if (!agencyId || !clientId || !briefingId) {
      setError('clientId e briefingId são obrigatórios');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [clientData, briefData] = await Promise.all([
        Client.get(clientId),
        Brief.get(briefingId),
      ]);

      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado');
      }
      if (!briefData || briefData.agencyId !== agencyId) {
        throw new Error('Campanha não encontrada');
      }

      const cycleId =
        briefData.ciclo_id || briefData.cycleId || briefData.cyclePlanId || null;
      const [cycleData, allTasks] = await Promise.all([
        safeGet(CyclePlan, cycleId),
        safeFilter(Task, { agencyId, clientId }),
      ]);

      const serviceId =
        cycleData?.serviceId || briefData.serviceId || null;
      const serviceData = await safeGet(Service, serviceId);

      const scoped = filterTasksByScope(allTasks, {
        cycleId: cycleData?.id || cycleId,
        briefingId: briefData.id,
      });

      setClient(clientData);
      setBriefing(briefData);
      setCycle(cycleData);
      setService(serviceData);
      setScopedTasks(scoped.tasks);
      setTaskScope(scoped.scope);
    } catch (err) {
      console.error('[client-campaign]', err);
      setError(err.message || 'Erro ao carregar campanha');
    } finally {
      setLoading(false);
    }
  }, [agencyId, clientId, briefingId]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const progress = useMemo(() => summarizeTasks(scopedTasks), [scopedTasks]);

  const clientHref = createPageUrl(`client-detail?clientId=${clientId}`);
  const briefingHref = createPageUrl(
    `client-briefing?clientId=${clientId}&briefingId=${briefingId}`
  );
  const tasksHref = createPageUrl(
    buildClientTasksHref({
      clientId,
      cycleId: cycle?.id || briefing?.ciclo_id || briefing?.cyclePlanId,
      briefingId,
      serviceId: service?.id || briefing?.serviceId,
    })
  );
  const workspaceHref = service?.id
    ? createPageUrl(`delivery-workspace?serviceId=${service.id}&section=tasks`)
    : null;

  const pendingTasks = useMemo(
    () =>
      scopedTasks
        .filter((t) => !['completed', 'done', 'cancelled', 'canceled'].includes(String(t.status || '')))
        .sort((a, b) => {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        })
        .slice(0, 8),
    [scopedTasks]
  );

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-[#6C47D8]" />
          <p className="text-sm text-[#7A7595]">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  if (error || !briefing || !client) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h1 className="text-xl font-semibold text-[#18162A]">Não foi possível abrir</h1>
        <p className="text-[#7A7595]">{error || 'Campanha não encontrada'}</p>
        <div className="flex gap-2 justify-center">
          {clientId && (
            <Button asChild variant="outline">
              <Link to={clientHref}>Voltar ao cliente</Link>
            </Button>
          )}
          <Button onClick={load}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const campaignName = briefing.nome_campanha || briefing.title || 'Campanha';
  const period =
    cycle?.cyclePeriod ||
    cycle?.title ||
    (briefing.data_gravacao_inicio
      ? `${briefing.data_gravacao_inicio}${
          briefing.data_gravacao_fim ? ` → ${briefing.data_gravacao_fim}` : ''
        }`
      : null);

  const statusText = statusLabel(briefing.status_campanha || briefing.status);
  const showPeriod =
    period &&
    String(period).trim().toLowerCase() !==
      String(campaignName).trim().toLowerCase();

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0 -ml-1.5">
              <Link to={clientHref} aria-label="Voltar ao cliente">
                <ArrowLeft className="w-4 h-4 text-[#7A7595]" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[#18162A] truncate leading-tight">
                {campaignName}
              </h1>
              <p className="text-xs text-[#7A7595] truncate">
                {statusText}
                {briefing.tipo_campanha ? ` · ${briefing.tipo_campanha}` : ''}
                {showPeriod ? ` · ${period}` : ''}
                {progress.total > 0
                  ? ` · ${progress.percentComplete}% · ${progress.completed}/${progress.total}`
                  : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <Button asChild size="sm">
              <Link to={tasksHref}>
                <CheckSquare className="w-4 h-4 mr-1" />
                Tarefas
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={briefingHref}>
                <FileText className="w-4 h-4 mr-1" />
                Editar
              </Link>
            </Button>
            {workspaceHref && (
              <Button asChild size="sm" variant="ghost">
                <Link to={workspaceHref}>Workspace</Link>
              </Button>
            )}
          </div>
        </div>
        {progress.total > 0 && (
          <Progress value={progress.percentComplete} className="h-1" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#E6F7F0] border-transparent shadow-none">
          <CardContent className="p-4">
            <p className="text-sm text-[#085041]">Progresso</p>
            <p className="text-3xl font-bold text-[#18162A] tabular-nums">
              {progress.percentComplete}%
            </p>
            <Progress value={progress.percentComplete} className="h-1.5 mt-3" />
            <p className="text-xs text-[#7A7595] mt-2">
              {progress.completed}/{progress.total} tarefas
              {taskScope === 'cycle' ? ' · ciclo compartilhado' : ''}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#FFF8E6] border-transparent shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7A5A10]">Pendentes</p>
              <p className="text-3xl font-bold text-[#18162A]">{progress.pending}</p>
            </div>
            <Clock className="h-7 w-7 text-[#E0B84A]" />
          </CardContent>
        </Card>
        <Card className="bg-[#EAF2FB] border-transparent shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#2E5A7A]">Em andamento</p>
              <p className="text-3xl font-bold text-[#18162A]">{progress.inProgress}</p>
            </div>
            <Target className="h-7 w-7 text-[#5B9BD5]" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo da campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-[#7A7595] mb-1">Objetivo</p>
              <p className="text-[#18162A] whitespace-pre-wrap">
                {briefing.objetivo || briefing.objectives || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#7A7595] mb-1">Ações comerciais</p>
              <p className="text-[#18162A] whitespace-pre-wrap">
                {briefing.acoes_comerciais || briefing.business_context || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#7A7595] mb-1">Quem aparece / locação</p>
              <p className="text-[#18162A]">{briefing.talento_locacao || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-[#7A7595] mb-1">Gravação (início)</p>
                <p className="text-[#18162A]">{briefing.data_gravacao_inicio || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#7A7595] mb-1">Gravação (fim)</p>
                <p className="text-[#18162A]">{briefing.data_gravacao_fim || '—'}</p>
              </div>
            </div>
            {(briefing.linha_focal || briefing.ciclo_comercial) && (
              <div className="grid grid-cols-2 gap-3">
                {briefing.ciclo_comercial && (
                  <div>
                    <p className="text-xs font-medium text-[#7A7595] mb-1">Ciclo comercial</p>
                    <p className="text-[#18162A]">{briefing.ciclo_comercial}</p>
                  </div>
                )}
                {briefing.linha_focal && (
                  <div>
                    <p className="text-xs font-medium text-[#7A7595] mb-1">Linha focal</p>
                    <p className="text-[#18162A]">{briefing.linha_focal}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Tarefas da campanha</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to={tasksHref}>
                Ver todas
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl space-y-3">
                <CheckSquare className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-sm text-[#7A7595]">
                  {progress.total === 0
                    ? 'Nenhuma tarefa vinculada ainda'
                    : 'Nenhuma tarefa pendente'}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to={tasksHref}>
                    {progress.total === 0 ? 'Abrir tarefas' : 'Ver tarefas'}
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      to={tasksHref}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E5F5]/80 p-3 hover:border-[#D4CBF5] hover:bg-[#FAFAFC] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#18162A] truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-[#7A7595] mt-0.5">
                          {task.dueDate
                            ? `Vence ${new Date(task.dueDate).toLocaleDateString()}`
                            : 'Sem prazo'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {taskStatusLabel(task.status)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

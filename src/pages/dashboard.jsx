import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { Brief } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { deriveActiveCampaigns } from '@/hooks/useClientHubData';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { buildClientTasksHref } from '@/lib/taskScope';
import { buildGreetingLine } from '@/lib/dashboardDayBriefing';

function firstNameFromFullName(fullName) {
  const first = String(fullName || '')
    .trim()
    .split(/\s+/)[0];
  if (!first || first === 'Usuário') return '';
  return first;
}

function formatDashboardDate(date = new Date()) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const OPEN_TASK_STATUSES = new Set([
  'todo',
  'in_progress',
  'pending',
  'blocked',
  'in_review',
]);

const DONE_GATE = new Set(['aprovado', 'approved', 'skipped', 'done']);

async function safeFilter(entity, filters) {
  try {
    const result = await entity.filter(filters);
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.warn('[dashboard] filter failed:', err?.message || err);
    return [];
  }
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addLocalDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDueDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isOpenTask(task) {
  const status = String(task?.status || '').toLowerCase();
  return OPEN_TASK_STATUSES.has(status);
}

function isWaitingOnClient(task) {
  const gatekeeper = String(task?.gatekeeper || '').toLowerCase();
  if (gatekeeper !== 'cliente' && gatekeeper !== 'client') return false;
  const gate = String(task?.gate_status || 'pendente').toLowerCase();
  return !DONE_GATE.has(gate);
}

function formatDueLabel(due, todayStart) {
  if (!due) return null;
  const dueDay = startOfLocalDay(due);
  const diffDays = Math.round((dueDay - todayStart) / 86400000);
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return n === 1 ? 'Atrasada 1 dia' : `Atrasada ${n} dias`;
  }
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  return due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function resolveClientName(clients, clientId) {
  if (!clientId) return null;
  const client = clients.find((c) => String(c.id) === String(clientId));
  return client?.name || null;
}

function resolveTaskHref(task) {
  const briefingId = task.briefingId || task.briefId || null;
  if (briefingId) {
    return createPageUrl(
      buildClientCampaignHref({
        clientId: task.clientId,
        briefingId,
      })
    );
  }
  if (task.clientId) {
    return createPageUrl(buildClientTasksHref({ clientId: task.clientId }));
  }
  return createPageUrl('tasks-manager');
}

function groupCampaignsByClient(clients, briefs, cycles, tasks, services) {
  const groups = [];

  for (const client of clients) {
    const clientId = client.id;
    const clientBriefs = briefs.filter(
      (b) =>
        String(b.clientId || '') === String(clientId) ||
        String(b.projectId || '') === String(clientId)
    );
    const clientCycles = cycles.filter((c) => String(c.clientId || '') === String(clientId));
    const clientTasks = tasks.filter((t) => String(t.clientId || '') === String(clientId));
    const clientServices = services.filter((s) => String(s.clientId || '') === String(clientId));

    const campaigns = deriveActiveCampaigns({
      briefs: clientBriefs,
      cycles: clientCycles,
      tasks: clientTasks,
      services: clientServices,
      clientId,
    });

    if (campaigns.length === 0) continue;

    groups.push({
      clientId,
      clientName: client.name || 'Cliente',
      clientStatus: client.status,
      href: createPageUrl(`client-detail?clientId=${clientId}`),
      campaigns,
    });
  }

  return groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
}

function buildTaskItem(task, clients, todayStart, kind) {
  const due = parseDueDate(task.dueDate);
  return {
    id: `task:${task.id}`,
    kind,
    title: task.title || 'Tarefa',
    clientName: resolveClientName(clients, task.clientId),
    dueLabel: formatDueLabel(due, todayStart),
    priority: String(task.priority || 'medium').toLowerCase(),
    href: resolveTaskHref(task),
    sortAt: due ? due.getTime() : Number.MAX_SAFE_INTEGER,
  };
}

/**
 * Fila de atenção: atrasadas, bloqueadas, aguardando cliente, aprovações.
 */
function buildAttentionQueue(tasks, clients, cycles, todayStart) {
  const items = [];
  const seen = new Set();

  const pushUnique = (item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };

  for (const task of tasks) {
    if (!isOpenTask(task)) continue;
    const due = parseDueDate(task.dueDate);
    const status = String(task.status || '').toLowerCase();
    const overdue = due && startOfLocalDay(due) < todayStart;

    if (overdue) {
      pushUnique(buildTaskItem(task, clients, todayStart, 'overdue'));
      continue;
    }
    if (status === 'blocked') {
      pushUnique(buildTaskItem(task, clients, todayStart, 'blocked'));
      continue;
    }
    if (isWaitingOnClient(task)) {
      pushUnique(buildTaskItem(task, clients, todayStart, 'waiting_client'));
    }
  }

  for (const cycle of cycles) {
    if (String(cycle.status || '') !== 'pending_approval') continue;
    const clientName = resolveClientName(clients, cycle.clientId) || cycle.clientName || null;
    const title =
      cycle.cyclePeriod ||
      cycle.title ||
      cycle.planData?.title ||
      'Plano aguardando aprovação';
    pushUnique({
      id: `cycle:${cycle.id}`,
      kind: 'approval',
      title,
      clientName,
      dueLabel: 'Aprovação',
      priority: 'high',
      href: createPageUrl(`cycle-approval?id=${cycle.id}`),
      sortAt: 0,
    });
  }

  const kindRank = {
    overdue: 0,
    blocked: 1,
    waiting_client: 2,
    approval: 3,
  };

  return items
    .sort((a, b) => {
      const rank = (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9);
      if (rank !== 0) return rank;
      return a.sortAt - b.sortAt;
    })
    .slice(0, 6);
}

/**
 * Agenda das próximas 48h (hoje + amanhã), sem atrasadas.
 */
function buildAgenda(tasks, clients, todayStart) {
  const horizonEnd = addLocalDays(todayStart, 2);

  return tasks
    .filter((task) => {
      if (!isOpenTask(task)) return false;
      if (String(task.status || '').toLowerCase() === 'blocked') return false;
      const due = parseDueDate(task.dueDate);
      if (!due) return false;
      const dueDay = startOfLocalDay(due);
      return dueDay >= todayStart && dueDay < horizonEnd;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 8)
    .map((task) => buildTaskItem(task, clients, todayStart, 'agenda'));
}

function buildSetupSteps({ clients, campaignGroups, tasks, services = [] }) {
  const hasClients = clients.length > 0;
  const activeServices = (Array.isArray(services) ? services : []).filter(
    (s) => s?.is_template !== true && s?.is_active !== false
  );
  const hasService = activeServices.length > 0;
  const hasCampaigns = campaignGroups.length > 0;
  const hasOpenTasks = tasks.some(isOpenTask);
  const clientsWithoutService = clients.filter(
    (c) => !activeServices.some((s) => String(s.clientId) === String(c.id))
  );
  const clientsWithoutCampaigns = clients.filter(
    (c) => !campaignGroups.some((g) => String(g.clientId) === String(c.id))
  );

  return [
    {
      id: 'client',
      done: hasClients,
      title: 'Cadastrar um cliente',
      description: 'Base para serviços, campanhas e tarefas.',
      href: createPageUrl('clients'),
      cta: 'Ir para clientes',
    },
    {
      id: 'service',
      done: hasService,
      title: 'Definir serviço contratado',
      description: hasClients
        ? clientsWithoutService.length > 0
          ? `${clientsWithoutService.length} cliente${clientsWithoutService.length === 1 ? '' : 's'} sem serviço.`
          : 'Contrato operacional definido.'
        : 'Primeiro cadastre um cliente.',
      href: clientsWithoutService[0]?.id
        ? createPageUrl(
            `client-detail?clientId=${clientsWithoutService[0].id}&setup=service`
          )
        : clients[0]?.id
          ? createPageUrl(`client-detail?clientId=${clients[0].id}&setup=service`)
          : createPageUrl('clients'),
      cta: hasClients ? 'Definir serviço' : 'Começar pelos clientes',
    },
    {
      id: 'campaign',
      done: hasCampaigns,
      title: 'Criar a campanha do mês',
      description: hasService
        ? clientsWithoutCampaigns.length > 0
          ? `${clientsWithoutCampaigns.length} cliente${clientsWithoutCampaigns.length === 1 ? '' : 's'} sem campanha ativa.`
          : 'Abra um cliente e inicie a campanha.'
        : 'Defina o serviço contratado antes.',
      href: hasService
        ? clientsWithoutCampaigns[0]?.id
          ? createPageUrl(
              `client-detail?clientId=${clientsWithoutCampaigns[0].id}&open=nova-campanha#campanhas`
            )
          : createPageUrl('clients')
        : clientsWithoutService[0]?.id
          ? createPageUrl(
              `client-detail?clientId=${clientsWithoutService[0].id}&setup=service`
            )
          : createPageUrl('clients'),
      cta: hasService ? 'Criar campanha' : 'Definir serviço',
    },
    {
      id: 'tasks',
      done: hasOpenTasks,
      title: 'Definir primeiras tarefas',
      description: 'Prazos e entregas alimentam a agenda da home.',
      href: hasCampaigns
        ? createPageUrl('tasks-manager')
        : hasService && clientsWithoutCampaigns[0]?.id
          ? createPageUrl(
              `client-detail?clientId=${clientsWithoutCampaigns[0].id}&open=nova-campanha#campanhas`
            )
          : clientsWithoutService[0]?.id
            ? createPageUrl(
                `client-detail?clientId=${clientsWithoutService[0].id}&setup=service`
              )
            : createPageUrl('clients'),
      cta: hasCampaigns ? 'Ver tarefas' : hasService ? 'Depois da campanha' : 'Depois do serviço',
    },
  ];
}

function kindBadge(kind) {
  switch (kind) {
    case 'overdue':
      return { label: 'Atrasada', className: 'text-[#c0392b]' };
    case 'blocked':
      return { label: 'Bloqueada', className: 'text-[#b45309]' };
    case 'waiting_client':
      return { label: 'Cliente', className: 'text-[#555]' };
    case 'approval':
      return { label: 'Aprovar', className: 'text-[#b45309]' };
    default:
      return null;
  }
}

function ItemRow({ item, showKindBadge = false }) {
  const badge = showKindBadge ? kindBadge(item.kind) : null;
  return (
    <li>
      <Link
        to={item.href}
        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f9f9f9]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#111]">{item.title}</p>
          <p className="text-xs text-[#555]">
            {[item.clientName, item.dueLabel].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.priority === 'high' && item.kind !== 'overdue' ? (
            <span className="text-xs font-semibold text-[#c0392b]">Alta</span>
          ) : null}
          {badge ? (
            <span className={`text-xs font-semibold ${badge.className}`}>{badge.label}</span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

/**
 * Home operacional — campanhas + agenda + fila de atenção.
 */
export default function DashboardPage() {
  const { agencyId, userName, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!agencyId) {
        setError('ID da organização não encontrado.');
        setLoading(false);
        return;
      }

      const [clients, services, tasks, briefs, cycles] = await Promise.all([
        safeFilter(Client, { agencyId }),
        safeFilter(Service, { agencyId, is_template: false }),
        safeFilter(Task, { agencyId }),
        safeFilter(Brief, { agencyId }),
        safeFilter(CyclePlan, { agencyId }),
      ]);

      const activeClients = clients.filter((c) => c.status === 'ativo');
      const clientsForCampaigns = activeClients.length > 0 ? activeClients : clients;
      const todayStart = startOfLocalDay();

      const campaignGroups = groupCampaignsByClient(
        clientsForCampaigns,
        briefs,
        cycles,
        tasks,
        services
      );

      const attentionQueue = buildAttentionQueue(tasks, clients, cycles, todayStart);
      const agenda = buildAgenda(tasks, clients, todayStart);
      const setupSteps = buildSetupSteps({
        clients: clientsForCampaigns,
        campaignGroups,
        tasks,
        services,
      });
      const clientsWithoutCampaigns = clientsForCampaigns
        .filter((c) => !campaignGroups.some((g) => String(g.clientId) === String(c.id)))
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          name: c.name || 'Cliente',
          href: createPageUrl(
            `client-detail?clientId=${c.id}&open=nova-campanha#campanhas`
          ),
        }));
      const clientsWithoutService = clientsForCampaigns
        .filter(
          (c) =>
            !(Array.isArray(services) ? services : []).some(
              (s) =>
                String(s.clientId) === String(c.id) &&
                s.is_template !== true &&
                s.is_active !== false
            )
        )
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          name: c.name || 'Cliente',
          href: createPageUrl(`client-detail?clientId=${c.id}&setup=service`),
        }));

      setDashboardData({
        campaignGroups,
        attentionQueue,
        agenda,
        setupSteps,
        clientsWithoutCampaigns,
        clientsWithoutService,
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    if (!sessionLoading && agencyId) {
      loadDashboardData();
    }
  }, [sessionLoading, agencyId, loadDashboardData]);

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#007bff]" aria-hidden />
          <p className="text-sm text-[#555]">Carregando operação…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#c0392b]" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-[#111]">Erro ao carregar</h2>
          <p className="mb-5 text-sm text-[#555]">{error}</p>
          <Button onClick={loadDashboardData} className="bg-[#007bff] hover:bg-[#0056b3]">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const {
    campaignGroups,
    attentionQueue,
    agenda,
    setupSteps,
    clientsWithoutCampaigns,
    clientsWithoutService = [],
  } = dashboardData;
  const hasCampaigns = campaignGroups.length > 0;
  const nextSetupStep = setupSteps.find((s) => !s.done) || null;
  const greeting = buildGreetingLine(firstNameFromFullName(userName));
  const todayLabel = formatDashboardDate();

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-1 pb-8 sm:px-0">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-[1.375rem] font-bold tracking-tight text-[#111] sm:text-[1.5rem]">
            {greeting}
          </h1>
          <p className="text-sm text-[#555]">
            {todayLabel} · Sua agenda e tarefas prioritárias
          </p>
        </div>
        <Button asChild className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto">
          <Link to={nextSetupStep?.href || createPageUrl('clients')}>
            <Plus className="mr-1.5 h-4 w-4" />
            {hasCampaigns ? 'Nova campanha' : nextSetupStep?.cta || 'Começar'}
          </Link>
        </Button>
      </header>

      {attentionQueue.length > 0 ? (
        <section aria-labelledby="attention-heading">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2
              id="attention-heading"
              className="text-sm font-semibold uppercase tracking-wide text-[#555]"
            >
              Precisa de atenção
            </h2>
            <Link
              to={createPageUrl('tasks-manager')}
              className="text-sm font-medium text-[#007bff] hover:underline"
            >
              Ver tarefas
            </Link>
          </div>
          <ul className="space-y-1 rounded-xl border border-[#eee] bg-white px-1 py-1">
            {attentionQueue.map((item) => (
              <ItemRow key={item.id} item={item} showKindBadge />
            ))}
          </ul>
        </section>
      ) : null}

      {(agenda.length > 0 || hasCampaigns) && (
        <section aria-labelledby="agenda-heading">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2
              id="agenda-heading"
              className="text-sm font-semibold uppercase tracking-wide text-[#555]"
            >
              Agenda · 48h
            </h2>
            <Link
              to={createPageUrl('tasks-manager')}
              className="text-sm font-medium text-[#007bff] hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {agenda.length > 0 ? (
            <ul className="space-y-1">
              {agenda.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#555]">
              Nada com prazo para hoje ou amanhã. Quando houver entregas, elas aparecem aqui.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="campaigns-heading" className="border-t border-[#eee] pt-8">
        <div className="mb-5">
          <h2 id="campaigns-heading" className="text-sm font-semibold uppercase tracking-wide text-[#555]">
            Campanhas
          </h2>
        </div>

        {!hasCampaigns ? (
          <div className="space-y-8">
            <div className="mx-auto max-w-lg text-center sm:text-left">
              <h3 className="mb-2 text-lg font-semibold text-[#111]">
                Nenhuma campanha ativa
              </h3>
              <p className="text-sm leading-relaxed text-[#555]">
                Monte o fluxo abaixo para a home passar a mostrar agenda, prazos e progresso.
              </p>
            </div>

            <ol className="space-y-3">
              {setupSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex gap-4 rounded-xl border border-[#eee] bg-white p-4"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.done
                        ? 'bg-[#e8f5e9] text-[#2e7d32]'
                        : 'bg-[#f0f0f0] text-[#555]'
                    }`}
                    aria-hidden
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        step.done ? 'text-[#555] line-through' : 'text-[#111]'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#555]">
                      {step.description}
                    </p>
                    {!step.done ? (
                      <Link
                        to={step.href}
                        className="mt-2 inline-flex items-center text-sm font-medium text-[#007bff] hover:underline"
                      >
                        {step.cta}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            {clientsWithoutService.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-medium text-[#111]">
                  Clientes sem serviço contratado
                </p>
                <ul className="space-y-1">
                  {clientsWithoutService.map((client) => (
                    <li key={client.id}>
                      <Link
                        to={client.href}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f9f9f9]"
                      >
                        <span className="truncate text-sm font-medium text-[#111]">
                          {client.name}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-[#007bff]">
                          Definir serviço
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : clientsWithoutCampaigns.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-medium text-[#111]">
                  Clientes prontos para campanha
                </p>
                <ul className="space-y-1">
                  {clientsWithoutCampaigns.map((client) => (
                    <li key={client.id}>
                      <Link
                        to={client.href}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f9f9f9]"
                      >
                        <span className="truncate text-sm font-medium text-[#111]">
                          {client.name}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-[#007bff]">
                          Criar campanha
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-10">
            {campaignGroups.map((group) => (
              <section key={group.clientId} className="space-y-4">
                <div className="border-b border-[#eee] pb-2">
                  <Link
                    to={group.href}
                    className="text-[15px] font-semibold text-[#111] hover:text-[#007bff]"
                  >
                    {group.clientName}
                  </Link>
                </div>

                <ul className="space-y-3">
                  {group.campaigns.map((campaign) => (
                    <li
                      key={campaign.id}
                      className="rounded-xl border border-[#eee] bg-white p-5 transition-colors hover:border-[#ddd]"
                    >
                      <div className="min-w-0">
                        <Link
                          to={campaign.href}
                          className="block truncate text-base font-semibold text-[#111] hover:text-[#007bff]"
                        >
                          {campaign.name}
                        </Link>
                        {(() => {
                          const subtitle = [
                            campaign.cyclePeriod || campaign.cycleTitle,
                            campaign.progress.total > 0
                              ? `${campaign.progress.completed}/${campaign.progress.total} tarefas`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          return subtitle ? (
                            <p className="mt-1 text-sm text-[#555]">{subtitle}</p>
                          ) : null;
                        })()}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Button asChild size="sm" className="bg-[#007bff] hover:bg-[#0056b3]">
                          <Link to={campaign.href}>
                            Abrir
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Link
                          to={campaign.tasksHref}
                          className="text-sm font-medium text-[#555] hover:text-[#111]"
                        >
                          Tarefas
                        </Link>
                        <Link
                          to={group.href}
                          className="text-sm font-medium text-[#555] hover:text-[#111]"
                        >
                          Cliente
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>

                <div>
                  <Link
                    to={createPageUrl(
                      `client-detail?clientId=${group.clientId}&open=nova-campanha#campanhas`
                    )}
                    className="text-sm font-medium text-[#007bff] hover:underline"
                  >
                    + Nova campanha neste cliente
                  </Link>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

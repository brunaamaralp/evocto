import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ClipboardCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/auth/SessionManager';
import { createPageUrl } from '@/utils';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import { Client, Task } from '@/api/entities';
import TaskCreateModal from '@/components/tasks/TaskCreateModal';
import TaskDueList from '@/components/tasks/TaskDueList';
import { buildGreetingLine, formatTodayHeroDate } from '@/lib/dashboardDayBriefing';
import { fetchPendingApprovals } from '@/lib/pendingApprovals';
import { filterMyTasks, summarizeTasks } from '@/lib/taskDueGroups';
import { isOpenTaskStatus } from '@/lib/taskFilterPresets';

const VIEW_KEY = 'evocto:home-view';

function firstNameFromFullName(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0];
  if (!first || first === 'Usuário') return '';
  return first;
}

async function safeFilter(entity, filters) {
  try {
    const result = await entity.filter(filters);
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.warn('[dashboard] filter failed:', err?.message || err);
    return [];
  }
}

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'team' ? 'team' : 'mine';
  } catch {
    return 'mine';
  }
}

function writeView(view) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* ignore */
  }
}

function Stat({ label, value, tone = 'default' }) {
  const color =
    tone === 'danger' && value > 0 ? 'text-[#c0392b]' : 'text-[#1A1210]';
  return (
    <div className="rounded-xl border border-[#E4DDD4] px-4 py-3">
      <p className="text-xs text-[#6B635C]">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

/**
 * Início — gestor de tarefas: minhas tarefas por prazo + clientes (projetos).
 */
export default function DashboardPage() {
  const { agencyId, userName, user, loading: sessionLoading } = useSession();
  const userId = user?.id || user?.data?.id || null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [view, setView] = useState(() => readView());
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!agencyId) return;
      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }
        const [taskRows, clientRows, approvals] = await Promise.all([
          safeFilter(Task, { agencyId }),
          safeFilter(Client, { agencyId }),
          fetchPendingApprovals(agencyId).catch(() => null),
        ]);
        setTasks(taskRows);
        setClients(clientRows);
        setApprovalsCount(approvals?.reliable ? approvals.count || 0 : 0);
      } catch (err) {
        console.error('[dashboard] load', err);
        if (!silent) setError(`Erro ao carregar dados: ${err.message}`);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [agencyId]
  );

  useEffect(() => {
    if (sessionLoading) return;
    if (!agencyId) {
      setLoading(false);
      return;
    }
    load();
  }, [sessionLoading, agencyId, load]);

  useEffect(() => {
    const onUpdated = (event) => {
      const { taskId, status, deleted } = event?.detail || {};
      if (taskId && (deleted || status === 'completed' || status === 'done')) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        window.setTimeout(() => load({ silent: true }), 800);
        return;
      }
      load({ silent: true });
    };
    const onRefresh = () => load({ silent: true });
    window.addEventListener('task:updated', onUpdated);
    window.addEventListener('task:refresh', onRefresh);
    return () => {
      window.removeEventListener('task:updated', onUpdated);
      window.removeEventListener('task:refresh', onRefresh);
    };
  }, [load]);

  const clientNames = useMemo(() => {
    const map = {};
    for (const c of clients) if (c?.id) map[String(c.id)] = c.name || 'Cliente';
    return map;
  }, [clients]);

  const myTasks = useMemo(() => filterMyTasks(tasks, userId), [tasks, userId]);
  const visibleTasks = view === 'team' ? tasks : myTasks;
  const summary = useMemo(() => summarizeTasks(visibleTasks), [visibleTasks]);

  const clientRows = useMemo(() => {
    const now = new Date();
    return clients
      .filter((c) => c.status !== 'arquivado' && c.archived !== true)
      .map((c) => {
        const ct = tasks.filter((t) => String(t.clientId || '') === String(c.id));
        const s = summarizeTasks(ct, now);
        const total = s.open + s.done;
        return {
          id: c.id,
          name: c.name || 'Cliente',
          ...s,
          pct: total > 0 ? Math.round((s.done / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.overdue - a.overdue || b.open - a.open || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [clients, tasks]);

  const changeView = (next) => {
    setView(next);
    writeView(next);
  };

  if (sessionLoading || loading) {
    return (
      <LoadingState variant="skeleton" size="page" message="Carregando…" className="min-h-[60vh]" />
    );
  }

  if (!agencyId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#c0392b]" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-[#1A1210]">Organização não encontrada</h2>
          <p className="mb-5 text-sm text-[#6B635C]">
            Sua conta não está vinculada a uma agência. Crie uma conta de agência ou peça um convite ao administrador.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="bg-[#B80015] hover:bg-[#8A0010]">
              <Link to="/create-account">Criar agência</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Erro ao carregar" message={error} onRetry={load} showHomeButton={false} />;
  }

  const openCount = tasks.filter(isOpenTaskStatus).length;

  return (
    <div className="-mx-4 min-h-[calc(100vh-4rem)] bg-white px-4 pb-10 pt-2 sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-[#F0EEF7] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1A1210] sm:text-[1.65rem]">
              {buildGreetingLine(firstNameFromFullName(userName))}
            </h1>
            <p className="text-sm text-[#6B635C]">{formatTodayHeroDate()}</p>
          </div>
          <Button
            type="button"
            className="w-full shrink-0 bg-[#B80015] hover:bg-[#8A0010] sm:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova tarefa
          </Button>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section aria-labelledby="my-tasks-heading" className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="my-tasks-heading" className="text-base font-semibold text-[#1A1210]">
                {view === 'team' ? 'Tarefas da equipe' : 'Minhas tarefas'}
              </h2>
              <div role="tablist" className="inline-flex rounded-full border border-[#E4DDD4] p-0.5 text-sm">
                {[
                  { id: 'mine', label: `Minhas (${myTasks.filter(isOpenTaskStatus).length})` },
                  { id: 'team', label: `Equipe (${openCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={view === tab.id}
                    onClick={() => changeView(tab.id)}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      view === tab.id ? 'bg-[#1A1210] text-white' : 'text-[#6B635C] hover:text-[#1A1210]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat label="Abertas" value={summary.open} />
              <Stat label="Atrasadas" value={summary.overdue} tone="danger" />
              <Stat label="Concluídas" value={summary.done} />
            </div>

            <TaskDueList
              tasks={visibleTasks}
              clientNames={clientNames}
              onTaskCompleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
              onTaskCreated={() => load({ silent: true })}
              emptyMessage={
                view === 'mine'
                  ? 'Nada atribuído a você. Adicione uma tarefa acima ou veja as da equipe.'
                  : 'Nenhuma tarefa aberta na equipe.'
              }
            />

            <Link
              to={createPageUrl('tasks-manager')}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#B80015] hover:underline"
            >
              Abrir quadro de tarefas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <aside className="space-y-6">
            {approvalsCount > 0 ? (
              <Link
                to={createPageUrl('approval-dashboard')}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E4DDD4] px-4 py-3 hover:bg-[#FAFAFB]"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-[#1A1210]">
                  <ClipboardCheck className="h-4 w-4 text-[#b45309]" />
                  Aprovações pendentes
                </span>
                <span className="text-sm font-semibold tabular-nums text-[#b45309]">{approvalsCount}</span>
              </Link>
            ) : null}

            <section aria-labelledby="clients-heading">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 id="clients-heading" className="text-sm font-semibold text-[#1A1210]">
                  Clientes
                </h2>
                <Link to={createPageUrl('clients')} className="text-sm font-medium text-[#B80015] hover:underline">
                  Ver todos
                </Link>
              </div>
              {clientRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E4DDD4] px-4 py-5 text-center">
                  <p className="text-sm text-[#6B635C]">Nenhum cliente ainda.</p>
                  <Link
                    to={createPageUrl('clients?create=1')}
                    className="mt-2 inline-block text-sm font-medium text-[#B80015] hover:underline"
                  >
                    Adicionar cliente
                  </Link>
                </div>
              ) : (
                <ul className="overflow-hidden rounded-xl border border-[#E4DDD4]">
                  {clientRows.map((row) => (
                    <li key={row.id} className="border-b border-[#F0EEF7] last:border-b-0">
                      <Link
                        to={createPageUrl(`client-detail?clientId=${row.id}`)}
                        className="block px-4 py-2.5 hover:bg-[#FAFAFB]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-[#1A1210]">{row.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-[#6B635C]">
                            {row.open} aberta{row.open === 1 ? '' : 's'}
                            {row.overdue > 0 ? (
                              <span className="ml-1 font-medium text-[#c0392b]">· {row.overdue} atras.</span>
                            ) : null}
                          </span>
                        </div>
                        {row.open + row.done > 0 ? (
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#F0EEF7]">
                            <div className="h-full rounded-full bg-[#2e7d32]" style={{ width: `${row.pct}%` }} />
                          </div>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>

        <TaskCreateModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultKind="task"
          onSuccess={() => {
            setCreateOpen(false);
            load({ silent: true });
          }}
        />
      </div>
    </div>
  );
}

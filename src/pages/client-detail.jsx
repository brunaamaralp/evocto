import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/auth/SessionManager';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import { Task } from '@/api/entities';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import EmptyState from '@/components/shared/EmptyState';
import useClientHubData from '@/hooks/useClientHubData';
import InviteClientModal from '@/components/client/InviteClientModal';
import ClientHubHeader from '@/components/client/hub/ClientHubHeader';
import ClientInfoCenterSummary from '@/components/client/hub/ClientInfoCenterSummary';
import TaskDueList from '@/components/tasks/TaskDueList';
import TaskCreateModal from '@/components/tasks/TaskCreateModal';
import { summarizeTasks } from '@/lib/taskDueGroups';

function Stat({ label, value, tone = 'default' }) {
  const color = tone === 'danger' && value > 0 ? 'text-[#c0392b]' : 'text-[#1A1210]';
  return (
    <div className="rounded-xl border border-[#E4DDD4] px-4 py-3">
      <p className="text-xs text-[#6B635C]">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

/**
 * Visão geral do cliente — tratado como um projeto: tarefas por prazo,
 * progresso e informações do cliente. Sem panorama nem ciclo de campanhas.
 */
export default function ClientDetailPage() {
  const { agencyId, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [liveTasks, setLiveTasks] = useState(null);

  const clientId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return getUrlSearchParam(urlParams, 'clientId', 'id');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') === 'invite') setInviteModalOpen(true);
  }, []);

  const {
    client,
    tasks,
    documents,
    learnings,
    accesses,
    generalNotes,
    loading,
    error,
    reload,
    counts,
  } = useClientHubData(clientId, agencyId);

  const refreshTasks = useCallback(async () => {
    if (!agencyId || !clientId) return;
    try {
      const rows = await Task.filter({ agencyId, clientId });
      setLiveTasks(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn('[client-detail] refresh tasks', err?.message || err);
    }
  }, [agencyId, clientId]);

  useEffect(() => {
    const onChange = () => refreshTasks();
    window.addEventListener('task:updated', onChange);
    window.addEventListener('task:refresh', onChange);
    return () => {
      window.removeEventListener('task:updated', onChange);
      window.removeEventListener('task:refresh', onChange);
    };
  }, [refreshTasks]);

  const clientTasks = useMemo(
    () => liveTasks ?? (Array.isArray(tasks) ? tasks : []),
    [liveTasks, tasks]
  );
  const summary = useMemo(() => summarizeTasks(clientTasks), [clientTasks]);
  const totalTracked = summary.open + summary.done;
  const pct = totalTracked > 0 ? Math.round((summary.done / totalTracked) * 100) : 0;

  if (!isAuthenticated) {
    return <LoadingState message="Verificando autenticação…" className="min-h-[60vh]" />;
  }

  if (!clientId) {
    return (
      <EmptyState
        variant="default"
        icon={AlertCircle}
        title="ID do cliente não encontrado"
        description="Abra o perfil a partir da lista de clientes."
        primaryAction={{ label: 'Voltar aos clientes', href: createPageUrl('clients') }}
      />
    );
  }

  if (loading) {
    return (
      <LoadingState variant="skeleton" size="page" message="Carregando cliente…" className="min-h-[60vh]" />
    );
  }

  if (error || !client) {
    return (
      <ErrorState
        title="Erro ao carregar cliente"
        message={error || 'Cliente não encontrado'}
        onRetry={reload}
        onGoHome={() => navigate(createPageUrl('clients'))}
        showHomeButton
      />
    );
  }

  const hasInvite = Boolean(client.portal_enabled || client.has_portal_access);
  const statusLabel = client.status
    ? String(client.status).charAt(0).toUpperCase() + String(client.status).slice(1)
    : null;
  const tasksHref = createPageUrl(`client-tasks?clientId=${clientId}`);

  const moreLinks = [
    { label: 'Quadro de tarefas', href: tasksHref },
    {
      label: `Documentos${counts?.documents > 0 ? ` (${counts.documents})` : ''}`,
      href: createPageUrl(`client-documents?clientId=${clientId}`),
    },
    {
      label: `Acessos${Array.isArray(accesses) && accesses.length > 0 ? ` (${accesses.length})` : ''}`,
      href: createPageUrl(`client-acessos?clientId=${clientId}`),
    },
    {
      label: `Aprendizados${counts?.learnings > 0 ? ` (${counts.learnings})` : ''}`,
      href: createPageUrl(`client-learnings?clientId=${clientId}`),
    },
    { label: 'Financeiro', href: createPageUrl(`client-financeiro?clientId=${clientId}`) },
    { label: 'Serviços', href: createPageUrl(`client-services?clientId=${clientId}`) },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1 pb-8 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ClientHubHeader clientName={client.name} statusLabel={statusLabel} />
        <Button
          className="w-full shrink-0 bg-primary hover:bg-[var(--color-primary-dark)] sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nova tarefa
        </Button>
      </div>

      <section aria-labelledby="client-tasks-heading" className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Abertas" value={summary.open} />
          <Stat label="Atrasadas" value={summary.overdue} tone="danger" />
          <Stat label="Concluídas" value={summary.done} />
        </div>

        {totalTracked > 0 ? (
          <div className="flex items-center gap-3">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F0EEF7]"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso: ${pct}%`}
            >
              <div className="h-full rounded-full bg-[#2e7d32]" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-[#6B635C]">{pct}% concluído</span>
          </div>
        ) : null}

        <div className="flex items-baseline justify-between">
          <h2 id="client-tasks-heading" className="text-base font-semibold text-[#1A1210]">
            Tarefas
          </h2>
          <Link
            to={tasksHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver quadro
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <TaskDueList
          tasks={clientTasks}
          clientId={clientId}
          onTaskCompleted={(id) =>
            setLiveTasks((prev) =>
              (prev ?? clientTasks).map((t) => (t.id === id ? { ...t, status: 'completed' } : t))
            )
          }
          onTaskCreated={refreshTasks}
          emptyMessage="Nenhuma tarefa aberta para este cliente. Adicione a primeira acima."
        />
      </section>

      <ClientInfoCenterSummary
        clientId={clientId}
        client={client}
        documents={documents}
        accesses={accesses}
        generalNotes={generalNotes}
        learnings={learnings}
      />

      {!hasInvite ? (
        <div className="flex flex-col gap-2 border-t border-[#E4DDD4] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#666]">Portal ainda não convidado</p>
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Convidar cliente
          </button>
        </div>
      ) : null}

      <section aria-labelledby="more-heading" className="border-t border-[#E4DDD4] pt-6">
        <h2 id="more-heading" className="mb-2 text-sm text-[#666]">
          Mais neste cliente
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {moreLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm text-[#6B635C] hover:text-primary hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <InviteClientModal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('open');
          window.history.replaceState({}, '', url.toString());
        }}
        client={client}
        onSuccess={() => reload?.()}
      />

      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultKind="task"
        defaultClientId={clientId}
        onSuccess={() => {
          setCreateOpen(false);
          refreshTasks();
        }}
      />
    </div>
  );
}

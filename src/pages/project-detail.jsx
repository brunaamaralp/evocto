import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  FolderKanban,
  Megaphone,
  Pencil,
  Plus,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import TaskCreateModal from '@/components/tasks/TaskCreateModal';
import { getTaskStatusConfig } from '@/lib/taskStatusCanonical';
import { isOpenTaskStatus } from '@/lib/taskFilterPresets';
import {
  buildTaskTree,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
} from '@/lib/projects/projectModel';
import { loadProjectBundle, updateProject } from '@/lib/projects/projectsApi';

function openTaskDrawer(taskId) {
  if (!taskId) return;
  window.dispatchEvent(new CustomEvent('task:open', { detail: { taskId } }));
}

function formatDue(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isDone(task) {
  const s = String(task?.status || '').toLowerCase();
  return s === 'completed' || s === 'done';
}

function TaskNode({ node, depth = 0, onAddSubtask }) {
  const [open, setOpen] = useState(true);
  const status = getTaskStatusConfig(node.status);
  const due = formatDue(node.dueDate);
  const hasChildren = node.subtasks.length > 0;
  const doneChildren = node.subtasks.filter(isDone).length;
  const overdue =
    node.dueDate && !isDone(node) && new Date(node.dueDate) < new Date(new Date().toDateString());

  return (
    <li className="border-b border-[#F0EEF7] last:border-b-0">
      <div
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-[#FAFAFB]"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#6B635C] hover:bg-[#F0EEF7]"
            aria-label={open ? 'Recolher subtarefas' : 'Expandir subtarefas'}
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : depth > 0 ? (
          <CornerDownRight className="h-4 w-4 shrink-0 text-[#C9C0E8]" aria-hidden />
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => openTaskDrawer(node.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={`truncate text-sm font-medium ${
              isDone(node) ? 'text-[#9A918A] line-through' : 'text-[#1A1210]'
            }`}
          >
            {node.title || 'Tarefa'}
          </p>
          <p className="mt-0.5 truncate text-xs text-[#6B635C]">
            {[
              node.assigneeName || node.assignedToName || null,
              hasChildren ? `${doneChildren}/${node.subtasks.length} subtarefas` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </button>
        {due ? (
          <span
            className={`shrink-0 text-[11px] tabular-nums ${
              overdue ? 'font-medium text-[#c0392b]' : 'text-[#6B635C]'
            }`}
          >
            {due}
          </span>
        ) : null}
        <span className="hidden shrink-0 text-xs text-[#6B635C] sm:inline">{status.label}</span>
        {depth === 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-[#6B635C]"
            title="Adicionar subtarefa"
            aria-label={`Adicionar subtarefa em "${node.title}"`}
            onClick={() => onAddSubtask(node)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <ul>
          {node.subtasks.map((child) => (
            <TaskNode key={child.id} node={child} depth={depth + 1} onAddSubtask={onAddSubtask} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function LinkedList({ icon: Icon, title, items, empty }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1A1210]">
        <Icon className="h-4 w-4 text-[#B80015]" aria-hidden />
        {title}
        <span className="font-normal text-[#6B635C]">· {items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E4DDD4] px-3 py-3 text-xs text-[#6B635C]">
          {empty}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-[#E4DDD4]">
          {items.map((item) => (
            <li key={item.id} className="border-b border-[#F0EEF7] last:border-b-0">
              {item.href ? (
                <Link
                  to={item.href}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[#FAFAFB]"
                >
                  <span className="truncate text-sm text-[#1A1210]">{item.label}</span>
                  {item.meta ? (
                    <span className="shrink-0 text-xs text-[#6B635C]">{item.meta}</span>
                  ) : null}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="truncate text-sm text-[#1A1210]">{item.label}</span>
                  {item.meta ? (
                    <span className="shrink-0 text-xs text-[#6B635C]">{item.meta}</span>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ProjectDetailPage() {
  const { agencyId, loading: sessionLoading } = useSession();
  const location = useLocation();
  const projectId = getUrlSearchParam(new URLSearchParams(location.search), 'projectId', 'id');
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [parentTask, setParentTask] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [showDone, setShowDone] = useState(false);

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      if (!agencyId || !projectId) return;
      if (!silent) setLoading(true);
      try {
        const data = await loadProjectBundle({ agencyId, projectId });
        setBundle(data);
        setError(null);
      } catch (err) {
        console.error('[project-detail]', err);
        if (!silent) setError(err?.message || 'Projeto não encontrado');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [agencyId, projectId]
  );

  useEffect(() => {
    if (sessionLoading) return;
    if (!projectId) {
      setLoading(false);
      setError('Projeto não informado.');
      return;
    }
    reload();
  }, [sessionLoading, projectId, reload]);

  useEffect(() => {
    const onUpdated = () => reload({ silent: true });
    window.addEventListener('task:updated', onUpdated);
    return () => window.removeEventListener('task:updated', onUpdated);
  }, [reload]);

  const tree = useMemo(() => {
    const tasks = bundle?.tasks || [];
    const visible = showDone ? tasks : tasks.filter((t) => isOpenTaskStatus(t) || t.parentTaskId);
    return buildTaskTree(visible).sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    });
  }, [bundle, showDone]);

  if (sessionLoading || loading) {
    return <LoadingState variant="skeleton" size="page" message="Carregando projeto…" />;
  }
  if (error || !bundle?.project) {
    return (
      <ErrorState
        title="Projeto indisponível"
        message={error || 'Projeto não encontrado.'}
        onRetry={() => reload()}
      />
    );
  }

  const { project, client, tasks, services, cycles, briefs } = bundle;
  const total = tasks.length;
  const done = tasks.filter(isDone).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const clientHref = client?.id ? createPageUrl(`client-detail?clientId=${client.id}`) : null;

  const changeStatus = async (status) => {
    try {
      await updateProject(project.id, { status });
      setBundle((prev) => ({ ...prev, project: { ...prev.project, status } }));
      toast.success('Status do projeto atualizado');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível atualizar');
    }
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    setEditingName(false);
    if (!name || name === project.name) return;
    try {
      await updateProject(project.id, { name });
      setBundle((prev) => ({ ...prev, project: { ...prev.project, name } }));
    } catch (err) {
      toast.error(err?.message || 'Não foi possível renomear');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-1 pb-10 sm:px-0">
      <header className="space-y-3 border-b border-[#F0EEF7] pb-6">
        {clientHref ? (
          <Link
            to={clientHref}
            className="inline-flex items-center gap-1 text-sm text-[#6B635C] hover:text-[#B80015]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {client.name}
          </Link>
        ) : (
          <span className="text-sm text-[#6B635C]">Interno da agência</span>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            {editingName ? (
              <Input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="h-9 text-lg font-semibold"
                aria-label="Nome do projeto"
              />
            ) : (
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#1A1210]">
                <FolderKanban className="h-6 w-6 text-[#B80015]" aria-hidden />
                <span className="truncate">{project.name}</span>
                <button
                  type="button"
                  className="text-[#9A918A] hover:text-[#B80015]"
                  aria-label="Renomear projeto"
                  onClick={() => {
                    setNameDraft(project.name || '');
                    setEditingName(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </h1>
            )}
            <p className="text-sm text-[#6B635C]">
              {total > 0 ? `${done}/${total} tarefas concluídas · ${pct}%` : 'Sem tarefas ainda'}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select value={project.status || 'ativo'} onValueChange={changeStatus}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Status do projeto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-[#B80015] hover:bg-[#8A0010]"
              onClick={() => {
                setParentTask(null);
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nova tarefa
            </Button>
          </div>
        </div>
        {total > 0 ? (
          <div
            className="h-1 overflow-hidden rounded-full bg-[#F0EEF7]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso do projeto: ${pct}%`}
          >
            <div className="h-full rounded-full bg-[#B80015]" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </header>

      <section aria-labelledby="project-tasks-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="project-tasks-heading" className="text-sm font-semibold text-[#1A1210]">
            Tarefas e subtarefas
          </h2>
          <button
            type="button"
            className="text-sm font-medium text-[#B80015] hover:underline"
            onClick={() => setShowDone((v) => !v)}
          >
            {showDone ? 'Ocultar concluídas' : 'Mostrar concluídas'}
          </button>
        </div>
        {tree.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#E4DDD4] px-4 py-6 text-center text-sm text-[#6B635C]">
            {total > 0 ? 'Todas as tarefas estão concluídas.' : 'Nenhuma tarefa neste projeto.'}
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-[#E4DDD4]">
            {tree.map((node) => (
              <TaskNode
                key={node.id}
                node={node}
                onAddSubtask={(task) => {
                  setParentTask(task);
                  setCreateOpen(true);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <LinkedList
          icon={Briefcase}
          title="Serviços"
          empty="Nenhum serviço vinculado."
          items={services.map((s) => ({
            id: s.id,
            label: s.name || 'Serviço',
            meta: s.is_active === false ? 'Inativo' : null,
            href: client?.id
              ? createPageUrl(`client-detail?clientId=${client.id}&serviceId=${s.id}#operacao`)
              : null,
          }))}
        />
        <LinkedList
          icon={CalendarDays}
          title="Ciclos"
          empty="Nenhum ciclo de planejamento."
          items={cycles.map((c) => ({
            id: c.id,
            label: c.title || c.period || 'Ciclo',
            meta: c.status || null,
            href: createPageUrl(`cycle-plan?id=${c.id}`),
          }))}
        />
        <LinkedList
          icon={Megaphone}
          title="Campanhas e briefings"
          empty="Nenhuma campanha."
          items={briefs.map((b) => ({
            id: b.id,
            label: b.title || b.nome_campanha || 'Briefing',
            meta: b.status || null,
            href: createPageUrl(`briefing-editor?briefingId=${b.id}`),
          }))}
        />
      </div>

      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultClientId={project.clientId || null}
        defaultServiceId={parentTask?.serviceId || project.serviceId || null}
        defaultProjectId={project.id}
        parentTaskId={parentTask?.id || null}
        onSuccess={() => {
          setCreateOpen(false);
          setParentTask(null);
          reload({ silent: true });
        }}
      />
    </div>
  );
}

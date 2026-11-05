import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderKanban, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PROJECT_STATUS_LABELS } from '@/lib/projects/projectModel';
import {
  buildProjectHref,
  createProject,
  listClientProjects,
} from '@/lib/projects/projectsApi';
import { isOpenTaskStatus } from '@/lib/taskFilterPresets';

function isDone(task) {
  const s = String(task?.status || '').toLowerCase();
  return s === 'completed' || s === 'done';
}

/**
 * Lista de projetos do cliente no hub (client-detail).
 * @param {{ agencyId: string, clientId: string, tasks?: object[] }} props
 */
export default function ClientProjectsSection({ agencyId, clientId, tasks = [] }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    if (!agencyId || !clientId) return;
    setLoading(true);
    setProjects(await listClientProjects({ agencyId, clientId }));
    setLoading(false);
  }, [agencyId, clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      if (!task?.projectId) continue;
      const key = String(task.projectId);
      const row = map.get(key) || { total: 0, done: 0, open: 0 };
      row.total += 1;
      if (isDone(task)) row.done += 1;
      else if (isOpenTaskStatus(task)) row.open += 1;
      map.set(key, row);
    }
    return map;
  }, [tasks]);

  const visible = projects.filter(
    (p) => showArchived || !['arquivado', 'concluido'].includes(p.status)
  );
  const hiddenCount = projects.length - visible.length;

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createProject({ agencyId, clientId, name });
      toast.success('Projeto criado');
      setDialogOpen(false);
      setName('');
      setProjects((prev) => [created, ...prev]);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível criar o projeto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="client-projects-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="client-projects-heading"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#1A1210]"
        >
          <FolderKanban className="h-4 w-4 text-[#B80015]" aria-hidden />
          Projetos
          {projects.length ? (
            <span className="font-normal text-[#6B635C]">· {projects.length}</span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#B80015] hover:underline"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Novo projeto
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-[#6B635C]">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando projetos…
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E4DDD4] px-4 py-4 text-sm text-[#6B635C]">
          Nenhum projeto ainda. Ao definir um serviço, um projeto é criado automaticamente.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((project) => {
            const s = stats.get(String(project.id)) || { total: 0, done: 0, open: 0 };
            const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
            return (
              <li key={project.id}>
                <Link
                  to={buildProjectHref(project.id)}
                  className="block h-full rounded-xl border border-[#E4DDD4] px-3.5 py-3 transition-colors hover:border-[#c9c0e8] hover:bg-[#FAFAFB]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1A1210]">
                        {project.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#6B635C]">
                        {[
                          project.status !== 'ativo'
                            ? PROJECT_STATUS_LABELS[project.status] || project.status
                            : null,
                          s.open ? `${s.open} em aberto` : null,
                          s.total ? `${s.done}/${s.total} concluídas` : 'Sem tarefas',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#C9C0E8]" aria-hidden />
                  </div>
                  {s.total ? (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#F0EEF7]">
                      <div
                        className="h-full rounded-full bg-[#B80015]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 || showArchived ? (
        <button
          type="button"
          className="text-xs text-[#6B635C] hover:text-[#B80015] hover:underline"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? 'Ocultar concluídos e arquivados' : `Ver concluídos e arquivados (${hiddenCount})`}
        </button>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Novo projeto</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="new-project-name">Nome</Label>
              <Input
                id="new-project-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Lançamento coleção verão"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || !name.trim()}
                className="bg-[#B80015] hover:bg-[#8A0010]"
              >
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Criar projeto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

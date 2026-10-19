import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import {
  EMPTY_TASK_FILTERS,
  buildAssigneeOptions,
  buildPhaseOptions,
} from '@/lib/taskFilterPresets';

/**
 * Filtros do quadro de tarefas: busca + selects.
 * Presets pessoais (my_*) ficam na URL / lógica — sem chips na UI.
 */
export default function TaskFilters({
  filters,
  onFiltersChange,
  tasks = [],
  users = [],
  compact = false,
}) {
  const assigneeOptions = useMemo(
    () => buildAssigneeOptions(tasks, users),
    [tasks, users]
  );
  const phaseOptions = useMemo(() => buildPhaseOptions(tasks), [tasks]);
  const statuses = [...new Set(tasks.map((t) => t.status).filter(Boolean))];
  const priorities = [...new Set(tasks.map((t) => t.priority).filter(Boolean))];

  const handleFilterChange = (key, value) => {
    onFiltersChange((prev) => ({
      ...prev,
      [key]: value,
      preset: null,
    }));
  };

  const clearFilters = () => {
    onFiltersChange({ ...EMPTY_TASK_FILTERS });
  };

  const hasActiveFilters = Object.entries(filters || {}).some(([key, value]) => {
    if (key === 'preset') return Boolean(value);
    if (typeof value === 'boolean') return value === true;
    return value !== 'all' && value !== '' && value != null;
  });

  const triggerClass = compact
    ? 'w-full sm:w-[150px] text-sm'
    : 'w-full sm:w-[140px] text-sm';

  return (
    <div className="space-y-3">
      <div className={`flex flex-col ${compact ? 'sm:flex-row' : ''} gap-2`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar tarefas..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <div
          className={
            compact
              ? 'flex flex-col sm:flex-row gap-2'
              : 'grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3'
          }
        >
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!compact ? (
            <>
              <Select
                value={filters.assignee || 'all'}
                onValueChange={(value) => handleFilterChange('assignee', value)}
              >
                <SelectTrigger className="w-full sm:w-[160px] text-sm">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {assigneeOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.phase || 'all'}
                onValueChange={(value) => handleFilterChange('phase', value)}
              >
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {phaseOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.priority || 'all'}
                onValueChange={(value) => handleFilterChange('priority', value)}
              >
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {getPriorityLabel(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.dueRange || 'all'}
                onValueChange={(value) => handleFilterChange('dueRange', value)}
              >
                <SelectTrigger className="w-full sm:w-[150px] text-sm">
                  <SelectValue placeholder="Vencimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer data</SelectItem>
                  <SelectItem value="overdue">Atrasadas</SelectItem>
                  <SelectItem value="next_48h">Próximas 48h</SelectItem>
                  <SelectItem value="this_week">Esta semana</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : null}

          {hasActiveFilters && (
            <Button
              variant={compact ? 'ghost' : 'outline'}
              size="sm"
              onClick={clearFilters}
              aria-label="Limpar filtros"
              className={compact ? undefined : 'col-span-2 sm:col-span-1 w-full sm:w-auto'}
            >
              <X className="w-4 h-4" />
              {!compact ? <span className="ml-2">Limpar</span> : null}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(status) {
  const labels = {
    backlog: 'Fila',
    todo: 'A fazer',
    in_progress: 'Em andamento',
    in_review: 'Em Revisão',
    waiting_client: 'Aguardando cliente',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    blocked: 'Bloqueado',
  };
  return labels[status] || status;
}

function getPriorityLabel(priority) {
  const labels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return labels[priority] || priority;
}

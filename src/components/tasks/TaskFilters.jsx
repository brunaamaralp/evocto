import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  X,
  User,
  Flag,
  Layers,
  Calendar,
} from 'lucide-react';
import {
  EMPTY_TASK_FILTERS,
  TASK_FILTER_PRESETS,
  buildAssigneeOptions,
  buildPhaseOptions,
} from '@/lib/taskFilterPresets';

/**
 * Componente de filtros unificados para todas as visualizações
 */
export default function TaskFilters({
  filters,
  onFiltersChange,
  tasks = [],
  users = [],
  currentUserId,
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

  const applyPreset = (preset) => {
    const next = preset.apply({ userId: currentUserId });
    onFiltersChange(next);
  };

  const hasActiveFilters = Object.entries(filters || {}).some(([key, value]) => {
    if (key === 'preset') return Boolean(value);
    return value !== 'all' && value !== '' && value != null;
  });

  const assigneeLabel =
    filters.assignee === 'unassigned'
      ? 'Sem responsável'
      : assigneeOptions.find((a) => a.id === filters.assignee)?.label || filters.assignee;

  const phaseLabel =
    phaseOptions.find((p) => p.id === filters.phase)?.label || filters.phase;

  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar tarefas..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-full sm:w-[150px] text-sm">
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
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="mx-4 sm:mx-0">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {TASK_FILTER_PRESETS.map((preset) => {
            const disabled = preset.id.startsWith('my_') && !currentUserId;
            const active = filters.preset === preset.id;
            return (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                disabled={disabled}
                onClick={() => applyPreset(preset)}
                className="text-xs"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {preset.label}
              </Button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar tarefas..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4">
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-full sm:w-[140px] text-sm">
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
            <SelectTrigger className="w-full sm:w-[140px] text-sm">
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
            <SelectTrigger className="w-full sm:w-[140px] text-sm">
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
              <SelectItem value="this_week">Esta semana</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="col-span-2 sm:col-span-1 w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.preset && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {TASK_FILTER_PRESETS.find((p) => p.id === filters.preset)?.label || filters.preset}
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Status: {getStatusLabel(filters.status)}
              </Badge>
            )}
            {filters.assignee !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Responsável: {assigneeLabel}
              </Badge>
            )}
            {filters.phase !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Fase: {phaseLabel}
              </Badge>
            )}
            {filters.priority !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Flag className="w-3 h-3" />
                Prioridade: {getPriorityLabel(filters.priority)}
              </Badge>
            )}
            {filters.dueRange === 'this_week' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Esta semana
              </Badge>
            )}
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Search className="w-3 h-3" />
                Busca: &quot;{filters.search}&quot;
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusLabel(status) {
  const labels = {
    backlog: 'Backlog',
    todo: 'A Fazer',
    in_progress: 'Em Progresso',
    in_review: 'Em Revisão',
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

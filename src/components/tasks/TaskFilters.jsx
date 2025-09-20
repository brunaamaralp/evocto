import React from 'react';
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
  Calendar,
  Flag,
  Layers
} from 'lucide-react';

/**
 * Componente de filtros unificados para todas as visualizações
 */
export default function TaskFilters({ filters, onFiltersChange, tasks }) {
  // Extrair opções únicas dos dados
  const assignees = [...new Set(tasks.map(t => t.assigneeName).filter(Boolean))];
  const phases = [...new Set(tasks.map(t => t.deliverableName).filter(Boolean))];
  const statuses = [...new Set(tasks.map(t => t.status))];
  const priorities = [...new Set(tasks.map(t => t.priority))];

  const handleFilterChange = (key, value) => {
    onFiltersChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      assignee: 'all',
      phase: 'all',
      priority: 'all',
      search: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== 'all' && value !== ''
  );

  return (
    <Card className="mx-4 sm:mx-0">
      <CardContent className="p-3 sm:p-4">
        {/* Busca - Sempre visível */}
        <div className="mb-3 sm:mb-0 sm:flex-1 sm:min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar tarefas..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Filtros em Grid Responsivo */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4">
          {/* Filtro de Status */}
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-full sm:w-[140px] text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de Responsável */}
          <Select value={filters.assignee} onValueChange={(value) => handleFilterChange('assignee', value)}>
            <SelectTrigger className="w-full sm:w-[160px] text-sm">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {assignees.map(assignee => (
                <SelectItem key={assignee} value={assignee}>
                  {assignee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de Fase */}
          <Select value={filters.phase} onValueChange={(value) => handleFilterChange('phase', value)}>
            <SelectTrigger className="w-full sm:w-[140px] text-sm">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {phases.map(phase => (
                <SelectItem key={phase} value={phase}>
                  {phase}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de Prioridade */}
          <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
            <SelectTrigger className="w-full sm:w-[140px] text-sm">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {priorities.map(priority => (
                <SelectItem key={priority} value={priority}>
                  {getPriorityLabel(priority)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botão Limpar Filtros */}
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

        {/* Indicadores de Filtros Ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Status: {getStatusLabel(filters.status)}
              </Badge>
            )}
            {filters.assignee !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Responsável: {filters.assignee}
              </Badge>
            )}
            {filters.phase !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Fase: {filters.phase}
              </Badge>
            )}
            {filters.priority !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Flag className="w-3 h-3" />
                Prioridade: {getPriorityLabel(filters.priority)}
              </Badge>
            )}
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Search className="w-3 h-3" />
                Busca: "{filters.search}"
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Funções auxiliares
function getStatusLabel(status) {
  const labels = {
    'backlog': 'Backlog',
    'todo': 'A Fazer',
    'in_progress': 'Em Progresso',
    'in_review': 'Em Revisão',
    'completed': 'Concluído',
    'cancelled': 'Cancelado',
    'blocked': 'Bloqueado'
  };
  return labels[status] || status;
}

function getPriorityLabel(priority) {
  const labels = {
    'low': 'Baixa',
    'medium': 'Média',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  return labels[priority] || priority;
}
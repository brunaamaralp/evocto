import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Flag,
  Edit,
  Eye,
  Download,
  Target,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PRIORITY_COLORS = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

const STATUS_COLORS = {
  backlog: 'bg-gray-100 text-gray-700',
  todo: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  in_review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  blocked: 'bg-orange-100 text-orange-700'
};

/**
 * Visualização Lista com tabela e exportação
 */
export default function TaskListView({ tasks, onTaskUpdate, onEditTask, onExport, loading }) {
  const [sortField, setSortField] = useState('dueDate');
  const [sortDirection, setSortDirection] = useState('asc');

  // Ordenar tarefas
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Tratamento especial para datas
      if (sortField === 'dueDate') {
        aValue = aValue ? new Date(aValue) : new Date('2099-12-31');
        bValue = bValue ? new Date(bValue) : new Date('2099-12-31');
      }

      // Tratamento especial para strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [tasks, sortField, sortDirection]);

  // Handler de ordenação
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Renderizar ícone de ordenação
  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  // Renderizar linha da tabela
  const renderTaskRow = (task) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const hasSpecialFlags = task.impactsKPI || task.generatesLearning || task.requiresApproval;

    return (
      <TableRow 
        key={task.id} 
        className={`hover:bg-gray-50 cursor-pointer ${isOverdue ? 'bg-red-50' : ''}`}
        onClick={() => onEditTask(task)}
      >
        {/* Título */}
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <span className="line-clamp-1">{task.title}</span>
            
            {/* Flags Especiais */}
            {hasSpecialFlags && (
              <div className="flex items-center gap-1">
                {task.impactsKPI && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <Target className="w-3 h-3 mr-1" />
                    KPI
                  </Badge>
                )}
                {task.generatesLearning && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    <Lightbulb className="w-3 h-3 mr-1" />
                    Aprendizado
                  </Badge>
                )}
                {task.requiresApproval && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aprovação
                  </Badge>
                )}
              </div>
            )}
          </div>
        </TableCell>

        {/* Responsável */}
        <TableCell>
          {task.assigneeName ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {task.assigneeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{task.assigneeName}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Não atribuído</span>
          )}
        </TableCell>

        {/* Entregável/Fase */}
        <TableCell>
          <span className="text-sm text-gray-600">
            {task.deliverableName || 'Sem fase'}
          </span>
        </TableCell>

        {/* Data de Entrega */}
        <TableCell>
          {task.dueDate ? (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              <Calendar className="w-3 h-3" />
              <span className="text-sm">
                {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
              {isOverdue && <AlertCircle className="w-3 h-3" />}
            </div>
          ) : (
            <span className="text-sm text-gray-400">Sem data</span>
          )}
        </TableCell>

        {/* Status */}
        <TableCell>
          <Badge className={`${STATUS_COLORS[task.status]} text-xs`}>
            {getStatusLabel(task.status)}
          </Badge>
        </TableCell>

        {/* Prioridade */}
        <TableCell>
          {task.priority ? (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`}></div>
              <span className="text-sm text-gray-600 capitalize">
                {getPriorityLabel(task.priority)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </TableCell>

        {/* Progresso */}
        <TableCell>
          {task.progress !== undefined ? (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{task.progress}%</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </TableCell>

        {/* Ações */}
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditTask(task);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return <ListLoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header com Ações - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Lista de Tarefas
          </h3>
          <p className="text-sm text-gray-600">
            {tasks.length} tarefas • Clique em uma tarefa para editar
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onExport} 
            disabled={tasks.length === 0}
            className="flex-1 sm:flex-none"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Tabela - Mobile Responsive */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-2">
                    Título
                    {renderSortIcon('title')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('assigneeName')}
                >
                  <div className="flex items-center gap-2">
                    Responsável
                    {renderSortIcon('assigneeName')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('deliverableName')}
                >
                  <div className="flex items-center gap-2">
                    Entregável/Fase
                    {renderSortIcon('deliverableName')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('dueDate')}
                >
                  <div className="flex items-center gap-2">
                    Data de Entrega
                    {renderSortIcon('dueDate')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {renderSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center gap-2">
                    Prioridade
                    {renderSortIcon('priority')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('progress')}
                >
                  <div className="flex items-center gap-2">
                    Progresso
                    {renderSortIcon('progress')}
                  </div>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Eye className="w-8 h-8 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Nenhuma tarefa encontrada
                      </h3>
                      <p className="text-gray-600">
                        Ajuste os filtros ou crie uma nova tarefa para começar.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedTasks.map(renderTaskRow)
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Concluídas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600">Em Progresso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Atrasadas</div>
          </CardContent>
        </Card>
      </div>
    </div>
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

// Skeleton de Loading
function ListLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-300 rounded w-1/3"></div>
      <Card>
        <CardContent className="p-0">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-100 border-t"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
